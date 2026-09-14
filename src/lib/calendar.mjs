const QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount } }
      }
    }
  }
}`;

export async function fetchCalendar(login, token) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ftfariasdev-solar-farm",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });

  if (!response.ok) throw new Error(`GitHub GraphQL answered HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(`GitHub GraphQL errors: ${payload.errors.map(({ message }) => message).join("; ")}`);
  return parseCalendar(payload);
}

// Rejects anything that does not look like a full year, so a bad response never replaces the last good farm.
export function parseCalendar(payload) {
  const calendar = payload?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error("The response has no contribution calendar");

  const { totalContributions, weeks } = calendar;
  if (!Number.isInteger(totalContributions) || totalContributions < 0) {
    throw new Error(`Unexpected total contributions: ${totalContributions}`);
  }
  if (!Array.isArray(weeks) || weeks.length < 52 || weeks.length > 54) {
    throw new Error(`Expected about a year of weeks, got ${weeks?.length}`);
  }

  const days = weeks.flatMap((week, column) =>
    (week.contributionDays ?? []).map(({ date, weekday, contributionCount }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error(`Malformed contribution day: ${JSON.stringify({ date, weekday })}`);
      }
      if (!Number.isInteger(contributionCount) || contributionCount < 0) {
        throw new Error(`Malformed contribution count on ${date}: ${contributionCount}`);
      }
      return { date, column, row: weekday, count: contributionCount };
    }),
  );

  if (days.length < 364 || days.length > 378) throw new Error(`Expected about a year of days, got ${days.length}`);
  if (days.some((day, index) => index > 0 && day.date <= days[index - 1].date)) {
    throw new Error("Contribution days are not in chronological order");
  }

  return { total: totalContributions, weeks: weeks.length, days };
}

// GitHub's own levels put most days of a light year on level 1. Quartiles of the active days
// spread the brightness evenly, so the farm shows a real range instead of a dim field.
export function levelsFor(days) {
  const active = days
    .map(({ count }) => count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  if (active.length === 0) return days.map(() => 0);

  const quartile = (fraction) => active[Math.min(active.length - 1, Math.floor(fraction * active.length))];
  const thresholds = [quartile(0.25), quartile(0.5), quartile(0.75)];
  return days.map(({ count }) => (count === 0 ? 0 : 1 + thresholds.filter((threshold) => count > threshold).length));
}

const groupThousands = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// The absolute number only appears at or above the threshold set in content.json.
export function farmLabel(total, { countThreshold, labelWithCount, labelWithoutCount }) {
  return total >= countThreshold ? labelWithCount.replace("{count}", groupThousands(total)) : labelWithoutCount;
}

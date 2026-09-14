import assert from "node:assert/strict";
import { test } from "node:test";
import { farmLabel, levelsFor, parseCalendar } from "../src/lib/calendar.mjs";

// A year of weeks, with the counts the caller asks for.
function payload({ weeks = 53, total = 1000, countFor = () => 1 } = {}) {
  const start = new Date("2025-09-07T00:00:00Z");
  let day = 0;
  return {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: total,
            weeks: Array.from({ length: weeks }, () => ({
              contributionDays: Array.from({ length: 7 }, (_, weekday) => {
                const date = new Date(start.getTime() + day * 86400000).toISOString().slice(0, 10);
                day += 1;
                return { date, weekday, contributionCount: countFor(day - 1) };
              }),
            })),
          },
        },
      },
    },
  };
}

test("parseCalendar accepts a full year and keeps the grid coordinates", () => {
  const calendar = parseCalendar(payload());
  assert.equal(calendar.total, 1000);
  assert.equal(calendar.weeks, 53);
  assert.equal(calendar.days.length, 371);
  assert.deepEqual(calendar.days[0], { date: "2025-09-07", column: 0, row: 0, count: 1 });
  assert.equal(calendar.days.at(-1).column, 52);
});

test("parseCalendar refuses anything that is not a year of contributions", () => {
  assert.throws(() => parseCalendar({}), /no contribution calendar/);
  assert.throws(() => parseCalendar(payload({ weeks: 10 })), /about a year of weeks/);
  assert.throws(() => parseCalendar(payload({ total: -3 })), /total contributions/);
  assert.throws(() => parseCalendar(payload({ countFor: () => -1 })), /Malformed contribution count/);
});

test("levelsFor spreads active days across the four levels", () => {
  const days = Array.from({ length: 100 }, (_, index) => ({ count: index < 40 ? 0 : index - 39 }));
  const levels = levelsFor(days);

  assert.deepEqual(new Set(levels.slice(0, 40)), new Set([0]));
  assert.deepEqual([...new Set(levels.slice(40))].sort(), [1, 2, 3, 4]);
  assert.equal(levels.at(-1), 4);
});

test("levelsFor handles a year with no contributions", () => {
  assert.deepEqual(levelsFor([{ count: 0 }, { count: 0 }]), [0, 0]);
});

test("farmLabel only shows the number at or above the threshold", () => {
  const farm = {
    countThreshold: 500,
    labelWithCount: "{count} contributions in the last year",
    labelWithoutCount: "Built from the last 12 months of contributions",
  };

  assert.equal(farmLabel(1081, farm), "1,081 contributions in the last year");
  assert.equal(farmLabel(500, farm), "500 contributions in the last year");
  assert.equal(farmLabel(499, farm), "Built from the last 12 months of contributions");
});

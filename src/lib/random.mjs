// Seeded pseudo-random numbers in [0, 1): decorative scatter that stays identical on every build.
export function randomSequence(seed) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

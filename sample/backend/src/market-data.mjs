const SYMBOLS = [
  "ALP",
  "NVA",
  "KYO",
  "MTR",
  "SOL",
  "ARC",
  "LUX",
  "ION",
  "PVT",
  "ORB",
  "VLT",
  "BRM",
];
const VENUES = ["TYO", "SIN", "FRA", "NY4", "LON", "SYD"];

export function createMarketRows(count) {
  let rngSeed = 17;

  return Array.from({ length: count }, (_, index) => {
    const symbol = `${SYMBOLS[index % SYMBOLS.length]}-${(index % 9) + 1}`;
    const venue = VENUES[index % VENUES.length] ?? "TYO";
    const price = roundTo(38 + index * 0.37 + nextRandom() * 9, 2);
    const volume = 120_000 + Math.floor(nextRandom() * 2_900_000);
    const change = roundTo((nextRandom() - 0.5) * 6, 2);
    const trades = 30 + Math.floor(nextRandom() * 900);
    const heat = clamp(
      Math.round(Math.abs(change) * 14 + nextRandom() * 20),
      6,
      100,
    );

    return {
      id: index,
      symbol,
      venue,
      price,
      volume,
      change,
      trades,
      heat,
      focused: index === 0,
    };
  });

  function nextRandom() {
    rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
    return rngSeed / 0xffffffff;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
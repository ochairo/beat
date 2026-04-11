const integerFormatCache = new Map<number, string>();
const currencyFormatCache = new Map<number, string>();
const percentFormatCache = new Map<number, string>();
const MAX_CACHE_SIZE = 8192;
const FIXED_TWO_DECIMALS = 2;
const FIXED_TWO_SCALE = 100;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatInteger(value: number): string {
  const cached = integerFormatCache.get(value);
  if (cached !== undefined) {
    return cached;
  }

  const formatted = formatGroupedInteger(value);
  cacheFormattedValue(integerFormatCache, value, formatted);
  return formatted;
}

export function formatCurrency(value: number): string {
  const normalizedValue = scaleFixedNumber(value, FIXED_TWO_SCALE);

  if (Object.is(normalizedValue, -0)) {
    return "-$0.00";
  }

  const cached = currencyFormatCache.get(normalizedValue);
  if (cached !== undefined) {
    return cached;
  }

  const negative = normalizedValue < 0;
  const formatted = `${negative ? "-$" : "$"}${formatScaledFixedNumber(Math.abs(normalizedValue), FIXED_TWO_DECIMALS)}`;
  cacheFormattedValue(currencyFormatCache, normalizedValue, formatted);
  return formatted;
}

export function formatPercent(value: number): string {
  const normalizedValue = scaleFixedNumber(value, FIXED_TWO_SCALE);

  if (Object.is(normalizedValue, -0)) {
    return "-0.00%";
  }

  const cached = percentFormatCache.get(normalizedValue);
  if (cached !== undefined) {
    return cached;
  }

  const negative = normalizedValue < 0;
  const formatted = `${negative ? "-" : "+"}${formatScaledFixedNumber(Math.abs(normalizedValue), FIXED_TWO_DECIMALS)}%`;
  cacheFormattedValue(percentFormatCache, normalizedValue, formatted);
  return formatted;
}

export function formatFixed2(value: number): string {
  const normalizedValue = scaleFixedNumber(value, FIXED_TWO_SCALE);
  const negative = normalizedValue < 0 || Object.is(normalizedValue, -0);
  return `${negative ? "-" : ""}${formatScaledFixedNumber(Math.abs(normalizedValue), FIXED_TWO_DECIMALS)}`;
}

function cacheFormattedValue(
  cache: Map<number, string>,
  key: number,
  value: string,
): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    cache.clear();
  }

  cache.set(key, value);
}

function scaleFixedNumber(value: number, scale: number): number {
  return Math.round(value * scale);
}

function formatScaledFixedNumber(
  scaledValue: number,
  decimals: number,
): string {
  const divisor = 10 ** decimals;
  const integerPart = Math.trunc(scaledValue / divisor);
  const fractionValue = scaledValue % divisor;
  const groupedIntegerPart = groupDigits(String(integerPart));

  if (decimals === 0) {
    return groupedIntegerPart;
  }

  const fractionPart = String(fractionValue).padStart(decimals, "0");

  return fractionPart.length === 0
    ? groupedIntegerPart
    : `${groupedIntegerPart}.${fractionPart}`;
}

function formatGroupedInteger(value: number): string {
  const negative = value < 0 || Object.is(value, -0);
  const absoluteValue = Math.abs(Math.trunc(value));
  const grouped = groupDigits(String(absoluteValue));
  return negative ? `-${grouped}` : grouped;
}

function groupDigits(digits: string): string {
  const length = digits.length;
  if (length <= 3) {
    return digits;
  }

  let result = "";
  let headLength = length % 3;

  if (headLength === 0) {
    headLength = 3;
  }

  result = digits.slice(0, headLength);

  for (let index = headLength; index < length; index += 3) {
    result += `,${digits.slice(index, index + 3)}`;
  }

  return result;
}

import { fileURLToPath } from "node:url";
import { pulse } from "@ochairo/pulse";
import {
  bindFields,
  bindExactMasked,
  bindMasked,
  bindProperty,
  bindText,
  createObjectKeyMask,
  jsx,
} from "../dist/index.js";
import { installDomGlobals, runBenchmarkSuite } from "./shared.mjs";

installDomGlobals();

const MARKET_ROW_PRICE_MASK = 1 << 0;
const MARKET_ROW_CHANGE_MASK = 1 << 1;
const MARKET_ROW_VOLUME_MASK = 1 << 2;
const MARKET_ROW_TRADES_MASK = 1 << 3;
const MARKET_ROW_HEAT_MASK = 1 << 4;
const MARKET_ROW_FOCUSED_MASK = 1 << 5;
const MARKET_ROW_FULL_MASK =
  MARKET_ROW_PRICE_MASK |
  MARKET_ROW_CHANGE_MASK |
  MARKET_ROW_VOLUME_MASK |
  MARKET_ROW_TRADES_MASK |
  MARKET_ROW_HEAT_MASK |
  MARKET_ROW_FOCUSED_MASK;
const getMarketRowChangeMask = createObjectKeyMask(
  {
    price: MARKET_ROW_PRICE_MASK,
    change: MARKET_ROW_CHANGE_MASK,
    volume: MARKET_ROW_VOLUME_MASK,
    trades: MARKET_ROW_TRADES_MASK,
    heat: MARKET_ROW_HEAT_MASK,
    focused: MARKET_ROW_FOCUSED_MASK,
  },
  MARKET_ROW_FULL_MASK,
);
const integerFormatCache = new Map();
const currencyFormatCache = new Map();
const percentFormatCache = new Map();
const MAX_FORMAT_CACHE_SIZE = 8_192;
const HEAT_WIDTH_TEXT = Array.from(
  { length: 101 },
  (_, index) => `${(index / 100).toFixed(2)}`,
);

function createMarketRow() {
  return {
    id: 12,
    symbol: "SYM-12",
    venue: "V-2",
    price: 102.25,
    volume: 100_100,
    change: 1.75,
    trades: 35,
    heat: 40,
    focused: false,
  };
}

function createMarketRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    symbol: `SYM-${index % 12}`,
    venue: `V-${index % 6}`,
    price: 100 + index * 0.1,
    volume: 100_000 + index * 13,
    change: (index % 9) - 4,
    trades: 25 + (index % 50),
    heat: 10 + (index % 90),
    focused: index === 0,
  }));
}

function createNextMarketRow(row) {
  return {
    ...row,
    price: row.price + 0.5,
    volume: row.volume + 250,
    change: row.change + 0.25,
    trades: row.trades + 1,
    heat: row.heat + 1,
    focused: !row.focused,
  };
}

function createMutatedSweepRow(row) {
  return {
    ...row,
    price: row.price + 1,
    volume: row.volume + 500,
    change: row.change + 0.25,
    trades: row.trades + 1,
    heat: row.heat >= 99 ? 10 : row.heat + 1,
  };
}

function createNextMarketFields(row) {
  return {
    price: row.price + 0.5,
    volume: row.volume + 250,
    change: row.change + 0.25,
    trades: row.trades + 1,
    heat: row.heat + 1,
    focused: !row.focused,
  };
}

function createBindTextState() {
  const value = pulse(0);
  const binding = bindText(value, (current) => current.toString());

  return {
    value,
    nextValue: 0,
    cleanup() {
      binding.cleanup?.();
    },
  };
}

function createBindPropertyState() {
  const value = pulse("100.00");
  const checked = pulse(false);
  const input = document.createElement("input");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const cleanupValue = bindProperty(input, "value", value);
  const cleanupChecked = bindProperty(checkbox, "checked", checked);

  return {
    value,
    checked,
    nextValue: 0,
    cleanup() {
      cleanupValue();
      cleanupChecked();
    },
  };
}

function createBindFieldsState() {
  const row = pulse(createMarketRow());
  const sink = {
    price: "",
    volume: "",
    change: "",
    trades: "",
    heat: "",
    focused: false,
  };

  const cleanup = bindFields(row, {
    price(value) {
      sink.price = value.toFixed(2);
    },
    volume(value) {
      sink.volume = value.toString();
    },
    change(value) {
      sink.change = value.toFixed(2);
    },
    trades(value) {
      sink.trades = value.toString();
    },
    heat(value) {
      sink.heat = value.toString();
    },
    focused(value) {
      sink.focused = value;
    },
  });

  return {
    row,
    cleanup,
  };
}

function createJsxPropertyBindingState() {
  const price = pulse("100.00");
  const checked = pulse(false);
  const rendered = jsx("div", {
    children: [
      jsx("input", { __beatPropertyBindings: { value: price } }),
      jsx("input", {
        type: "checkbox",
        __beatPropertyBindings: { checked },
      }),
    ],
  });

  if (
    !(typeof rendered === "object" && rendered !== null && "node" in rendered)
  ) {
    throw new Error("Expected rendered Beat node");
  }

  const host = document.createElement("div");
  host.append(rendered.node);

  return {
    price,
    checked,
    cleanup() {
      rendered.cleanup?.();
      host.replaceChildren();
    },
  };
}

function cacheFormattedValue(cache, key, value) {
  if (cache.size >= MAX_FORMAT_CACHE_SIZE) {
    cache.clear();
  }

  cache.set(key, value);
}

function groupDigits(digits) {
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

function formatInteger(value) {
  const cached = integerFormatCache.get(value);

  if (cached !== undefined) {
    return cached;
  }

  const negative = value < 0 || Object.is(value, -0);
  const grouped = groupDigits(String(Math.abs(Math.trunc(value))));
  const formatted = negative ? `-${grouped}` : grouped;

  cacheFormattedValue(integerFormatCache, value, formatted);
  return formatted;
}

function formatFixedNumber(value, decimals) {
  const [integerPart, fractionPart = ""] = value.toFixed(decimals).split(".");
  const groupedInteger = groupDigits(integerPart);

  return fractionPart.length === 0
    ? groupedInteger
    : `${groupedInteger}.${fractionPart}`;
}

function formatCurrency(value) {
  const normalized = Math.round(value * 100) / 100;
  const cached = currencyFormatCache.get(normalized);

  if (cached !== undefined) {
    return cached;
  }

  const negative = normalized < 0 || Object.is(normalized, -0);
  const formatted = `${negative ? "-$" : "$"}${formatFixedNumber(Math.abs(normalized), 2)}`;

  cacheFormattedValue(currencyFormatCache, normalized, formatted);
  return formatted;
}

function formatPercent(value) {
  const normalized = Math.round(value * 100) / 100;
  const cached = percentFormatCache.get(normalized);

  if (cached !== undefined) {
    return cached;
  }

  const negative = normalized < 0 || Object.is(normalized, -0);
  const formatted = `${negative ? "-" : "+"}${formatFixedNumber(Math.abs(normalized), 2)}%`;

  cacheFormattedValue(percentFormatCache, normalized, formatted);
  return formatted;
}

function applyHeatFill(element, value) {
  element.style.transform = `scaleX(${readHeatWidth(value)})`;
}

function readHeatWidth(value) {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
  return HEAT_WIDTH_TEXT[clampedValue] ?? "100%";
}

function readRowClassName(focused, positiveChange) {
  if (focused) {
    return positiveChange ? "is-focused is-up" : "is-focused is-down";
  }

  return positiveChange ? "is-up" : "is-down";
}

function applyRowState(element, row, state) {
  const nextPositiveChange = row.change >= 0;

  if (
    row.focused === state.focused &&
    nextPositiveChange === state.positiveChange
  ) {
    return;
  }

  state.focused = row.focused;
  state.positiveChange = nextPositiveChange;
  const nextClassName = readRowClassName(row.focused, nextPositiveChange);

  if (nextClassName !== state.className) {
    state.className = nextClassName;
    element.className = nextClassName;
  }
}

function createMountedMarketRowBindingState(value, host) {
  const rowElement = document.createElement("article");
  const priceTextNode = document.createTextNode(formatCurrency(value.price));
  const changeTextNode = document.createTextNode(formatPercent(value.change));
  const volumeTextNode = document.createTextNode(formatInteger(value.volume));
  const tradesTextNode = document.createTextNode(formatInteger(value.trades));
  const heatFillElement = document.createElement("div");
  const classState = {
    className: readRowClassName(value.focused, value.change >= 0),
    focused: value.focused,
    positiveChange: value.change >= 0,
  };
  const heatState = {
    width: readHeatWidth(value.heat),
  };

  rowElement.append(
    priceTextNode,
    changeTextNode,
    volumeTextNode,
    tradesTextNode,
    heatFillElement,
  );
  rowElement.className = classState.className;
  heatFillElement.style.transform = `scaleX(${heatState.width})`;
  host.append(rowElement);

  return {
    rowElement,
    priceTextNode,
    changeTextNode,
    volumeTextNode,
    tradesTextNode,
    heatFillElement,
    classState,
    heatState,
  };
}

function applyMountedRowClassState(
  bindingState,
  nextFocused,
  nextPositiveChange,
) {
  const { rowElement, classState } = bindingState;

  if (
    nextFocused === classState.focused &&
    nextPositiveChange === classState.positiveChange
  ) {
    return;
  }

  classState.focused = nextFocused;
  classState.positiveChange = nextPositiveChange;
  const nextClassName = readRowClassName(nextFocused, nextPositiveChange);

  if (nextClassName !== classState.className) {
    classState.className = nextClassName;
    rowElement.className = nextClassName;
  }
}

function applyMountedRowHeat(bindingState, heat) {
  const nextHeatWidth = readHeatWidth(heat);

  if (nextHeatWidth !== bindingState.heatState.width) {
    bindingState.heatState.width = nextHeatWidth;
    bindingState.heatFillElement.style.width = nextHeatWidth;
  }
}

function applyMountedRowAll(bindingState, nextValue) {
  applyRowState(bindingState.rowElement, nextValue, bindingState.classState);
  bindingState.priceTextNode.data = formatCurrency(nextValue.price);
  bindingState.changeTextNode.data = formatPercent(nextValue.change);
  bindingState.volumeTextNode.data = formatInteger(nextValue.volume);
  bindingState.tradesTextNode.data = formatInteger(nextValue.trades);
  applyMountedRowHeat(bindingState, nextValue.heat);
}

function bindExactMaskedMountedRow(row, bindingState) {
  return bindExactMasked(row, {
    fullMask: MARKET_ROW_FULL_MASK,
    getChangeMask: getMarketRowChangeMask,
    apply(nextValue, mask) {
      if (mask === MARKET_ROW_FULL_MASK) {
        applyMountedRowAll(bindingState, nextValue);
        return;
      }

      if ((mask & MARKET_ROW_PRICE_MASK) !== 0) {
        bindingState.priceTextNode.data = formatCurrency(nextValue.price);
      }

      if ((mask & MARKET_ROW_CHANGE_MASK) !== 0) {
        bindingState.changeTextNode.data = formatPercent(nextValue.change);

        if (
          nextValue.change >= 0 !== bindingState.classState.positiveChange ||
          nextValue.focused !== bindingState.classState.focused
        ) {
          applyMountedRowClassState(
            bindingState,
            nextValue.focused,
            nextValue.change >= 0,
          );
        }
      }

      if ((mask & MARKET_ROW_VOLUME_MASK) !== 0) {
        bindingState.volumeTextNode.data = formatInteger(nextValue.volume);
      }

      if ((mask & MARKET_ROW_TRADES_MASK) !== 0) {
        bindingState.tradesTextNode.data = formatInteger(nextValue.trades);
      }

      if ((mask & MARKET_ROW_HEAT_MASK) !== 0) {
        applyMountedRowHeat(bindingState, nextValue.heat);
      }

      if (
        (mask & MARKET_ROW_FOCUSED_MASK) !== 0 &&
        nextValue.focused !== bindingState.classState.focused
      ) {
        applyMountedRowClassState(
          bindingState,
          nextValue.focused,
          nextValue.change >= 0,
        );
      }
    },
  });
}

function createMountedMarketRowBinderBenchmarkState(bindRow) {
  const rows = pulse(createMarketRows(10_000));
  const rowNodes = rows
    .get()
    .map((_, index) => rows[index])
    .filter(Boolean);
  const host = document.createElement("div");
  const cleanups = rowNodes.map((row) => {
    const bindingState = createMountedMarketRowBindingState(row.get(), host);
    return bindRow(row, bindingState);
  });

  return {
    rows,
    rowNodes,
    cleanup() {
      for (const cleanup of cleanups) {
        cleanup();
      }

      host.replaceChildren();
    },
  };
}

function createExactMaskedMarketRowBinderBenchmarkState() {
  return createMountedMarketRowBinderBenchmarkState(bindExactMaskedMountedRow);
}

export function runBeatBenchmarkSuite(options = {}) {
  return runBenchmarkSuite(
    "beat benchmark",
    [
      {
        title: "Binding Micro Costs",
        cases: [
          {
            name: "bindText update",
            iterations: 10_000,
            setup: createBindTextState,
            task: (state) => {
              state.nextValue += 1;
              state.value.set(state.nextValue);
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
          {
            name: "bindProperty input and checkbox update",
            iterations: 10_000,
            setup: createBindPropertyState,
            task: (state) => {
              state.nextValue += 1;
              state.value.set((100 + state.nextValue).toFixed(2));
              state.checked.set((state.nextValue & 1) === 0);
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
          {
            name: "bindFields market leaf field updates",
            iterations: 10_000,
            setup: createBindFieldsState,
            task: (state) => {
              const nextFields = createNextMarketFields(state.row.get());
              state.row.price.set(nextFields.price);
              state.row.volume.set(nextFields.volume);
              state.row.change.set(nextFields.change);
              state.row.trades.set(nextFields.trades);
              state.row.heat.set(nextFields.heat);
              state.row.focused.set(nextFields.focused);
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
          {
            name: "bindFields market leaf field updates in batch",
            iterations: 10_000,
            setup: createBindFieldsState,
            task: (state) => {
              const nextFields = createNextMarketFields(state.row.get());
              state.row.batch(() => {
                state.row.price.set(nextFields.price);
                state.row.volume.set(nextFields.volume);
                state.row.change.set(nextFields.change);
                state.row.trades.set(nextFields.trades);
                state.row.heat.set(nextFields.heat);
                state.row.focused.set(nextFields.focused);
              });
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
          {
            name: "bindFields market row replace",
            iterations: 10_000,
            setup: createBindFieldsState,
            task: (state) => {
              state.row.set(createNextMarketRow(state.row.get()));
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
          {
            name: "bindFields market row replace in batch",
            iterations: 10_000,
            setup: createBindFieldsState,
            task: (state) => {
              state.row.batch(() => {
                state.row.set(createNextMarketRow(state.row.get()));
              });
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
          {
            name: "jsx pulse property bindings",
            iterations: 10_000,
            setup: createJsxPropertyBindingState,
            task: (state) => {
              state.price.set((100 + Math.random()).toFixed(2));
              state.checked.set(!state.checked.get());
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
        ],
      },
      {
        title: "Mounted Row Binder Costs",
        cases: [
          {
            name: "exact-masked row binder 10000-row batched sweep",
            iterations: 10,
            setup: createExactMaskedMarketRowBinderBenchmarkState,
            task: (state) => {
              state.rows.batch(() => {
                for (const row of state.rowNodes) {
                  row.set(createMutatedSweepRow(row.get()));
                }
              });
            },
            teardown: (state) => {
              state.cleanup();
            },
          },
        ],
      },
    ],
    options,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBeatBenchmarkSuite();
}

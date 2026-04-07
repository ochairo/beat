import { fileURLToPath } from "node:url";
import { pulse } from "../../pulse/dist/index.js";
import { bindFields, bindProperty, bindText, jsx } from "../dist/index.js";
import { installDomGlobals, runBenchmarkSuite } from "./shared.mjs";

installDomGlobals();

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
      jsx("input", { value: price }),
      jsx("input", { type: "checkbox", checked }),
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

export function runBeatBenchmarkSuite(options = {}) {
  return runBenchmarkSuite(
    "beat benchmark",
    [
      {
        title: "Binding Costs",
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
    ],
    options,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBeatBenchmarkSuite();
}

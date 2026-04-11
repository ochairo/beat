import { pulse, type Pulse } from "@ochairo/pulse";
import { describe, expect, it } from "vitest";
import {
  For,
  Show,
  bindExactMasked,
  bindFields,
  bindMasked,
  bindProperty,
  bindText,
  createObjectKeyMask,
  jsx,
  mountEach,
} from "../src/index.js";

describe("dom bindings", () => {
  it("bindText updates the same text node when the pulse changes", () => {
    const count = pulse(1);
    const binding = bindText(count, (value) => `${value}`);

    expect(binding.node.data).toBe("1");

    count.set(2);

    expect(binding.node.data).toBe("2");

    binding.cleanup?.();
  });

  it("mountEach rerenders structural array changes", () => {
    const rows = pulse(["Ada"]);
    const container = document.createElement("div");

    const cleanup = mountEach(container, rows, (row) => {
      const element = document.createElement("span");
      element.textContent = row.get();
      return element;
    });

    expect(container.textContent).toBe("Ada");

    rows[1]?.set("Grace");

    expect(container.textContent).toBe("AdaGrace");

    cleanup();
  });

  it("mountEach allows defined array items whose value is undefined", () => {
    const rows = pulse([undefined, "Ada"] as Array<string | undefined>);
    const container = document.createElement("div");

    const cleanup = mountEach(container, rows, (row) => {
      const element = document.createElement("span");
      element.textContent = row.get() ?? "empty";
      return element;
    });

    expect(container.textContent).toBe("emptyAda");

    cleanup();
  });

  it("For propagates child pulse updates without structural array changes", () => {
    const rows = pulse([{ id: 1, label: "Ada" }]);
    const rendered = For({
      each: rows,
      key: (value) => value.id,
      children: (row) => jsx("span", { children: row.label }),
    });

    const host = document.createElement("div");
    host.append(rendered.node);

    expect(host.textContent).toBe("Ada");

    rows[0]?.set({ id: 1, label: "Grace" });

    expect(host.textContent).toBe("Grace");

    rendered.cleanup?.();
  });

  it("For item pulse writes update the source array", () => {
    const rows = pulse([{ id: 1, label: "Ada" }]);
    let firstRow: Pulse<{ id: number; label: string }> | undefined;

    const rendered = For({
      each: rows,
      key: (value) => value.id,
      children: (row, index) => {
        if (index === 0) {
          firstRow = row;
        }

        return jsx("span", { children: row.label });
      },
    });

    const host = document.createElement("div");
    host.append(rendered.node);

    firstRow?.label.set("Grace");

    expect(rows.get()).toEqual([{ id: 1, label: "Grace" }]);
    expect(host.textContent).toBe("Grace");

    rendered.cleanup?.();
  });

  it("For keeps keyed entries mounted for exact-path child updates", () => {
    const rows = pulse([
      { id: 1, label: "Ada" },
      { id: 2, label: "Grace" },
    ]);
    let renderCount = 0;

    const rendered = For({
      each: rows,
      key: (value) => value.id,
      children: (row) => {
        renderCount += 1;
        return jsx("span", { children: row.label });
      },
    });

    const host = document.createElement("div");
    host.append(rendered.node);

    expect(renderCount).toBe(2);
    expect(host.textContent).toBe("AdaGrace");

    const firstRowValue = rows.get()[0];

    expect(firstRowValue).toBeDefined();

    if (!firstRowValue) {
      throw new Error("Expected first row pulse to exist.");
    }

    const firstRow = rows[0] as Pulse<{ id: number; label: string }>;

    firstRow.label.set("Lin");

    expect(renderCount).toBe(2);
    expect(host.textContent).toBe("LinGrace");

    rendered.cleanup?.();
  });

  it("bindFields only applies changed object fields", () => {
    const state = pulse({ count: 1, label: "Ada" });
    const seen: string[] = [];

    const cleanup = bindFields(state, {
      count(value) {
        seen.push(`count:${value.toString()}`);
      },
      label(value) {
        seen.push(`label:${value}`);
      },
    });

    expect(seen).toEqual(["count:1", "label:Ada"]);

    state.count.set(2);

    expect(seen).toEqual(["count:1", "label:Ada", "count:2"]);

    state.label.set("Grace");

    expect(seen).toEqual(["count:1", "label:Ada", "count:2", "label:Grace"]);

    cleanup();
  });

  it("bindFields works on child object pulses with absolute mutation paths", () => {
    const state = pulse({ user: { name: "Ada", role: "admin" } });
    const seen: string[] = [];

    const cleanup = bindFields(state.user, {
      name(value) {
        seen.push(`name:${value}`);
      },
      role(value) {
        seen.push(`role:${value}`);
      },
    });

    expect(seen).toEqual(["name:Ada", "role:admin"]);

    state.user.set({ name: "Ada", role: "editor" });

    expect(seen).toEqual(["name:Ada", "role:admin", "role:editor"]);

    cleanup();
  });

  it("bindFields applies a batched repeated field change once", () => {
    const state = pulse({ count: 0, label: "Ada" });
    const seen: string[] = [];

    const cleanup = bindFields(state, {
      count(value) {
        seen.push(`count:${value.toString()}`);
      },
      label(value) {
        seen.push(`label:${value}`);
      },
    });

    state.batch(() => {
      state.count.set(1);
      state.count.set(2);
    });

    expect(seen).toEqual(["count:0", "label:Ada", "count:2"]);

    cleanup();
  });

  it("bindMasked applies only the masked changed fields", () => {
    const COUNT_MASK = 1 << 0;
    const LABEL_MASK = 1 << 1;
    const state = pulse({ count: 0, label: "Ada" });
    const seen: string[] = [];

    const cleanup = bindMasked(state, {
      fullMask: COUNT_MASK | LABEL_MASK,
      getChangeMask(changes) {
        let mask = 0;

        for (const change of changes) {
          if (change.key === "count") {
            mask |= COUNT_MASK;
            continue;
          }

          if (change.key === "label") {
            mask |= LABEL_MASK;
          }
        }

        return mask;
      },
      apply(value, mask) {
        if (mask & COUNT_MASK) {
          seen.push(`count:${value.count.toString()}`);
        }

        if (mask & LABEL_MASK) {
          seen.push(`label:${value.label}`);
        }
      },
    });

    expect(seen).toEqual(["count:0", "label:Ada"]);

    state.batch(() => {
      state.count.set(1);
      state.count.set(2);
      state.label.set("Grace");
    });

    expect(seen).toEqual(["count:0", "label:Ada", "count:2", "label:Grace"]);

    cleanup();
  });

  it("bindExactMasked applies exact object replacements through one listener", () => {
    const COUNT_MASK = 1 << 0;
    const LABEL_MASK = 1 << 1;
    const state = pulse({ item: { count: 0, label: "Ada" } });
    const seen: string[] = [];

    const cleanup = bindExactMasked(state.item, {
      fullMask: COUNT_MASK | LABEL_MASK,
      getChangeMask: createObjectKeyMask<{ count: number; label: string }>(
        {
          count: COUNT_MASK,
          label: LABEL_MASK,
        },
        COUNT_MASK | LABEL_MASK,
      ),
      apply(value, mask) {
        if ((mask & COUNT_MASK) !== 0) {
          seen.push(`count:${value.count.toString()}`);
        }

        if ((mask & LABEL_MASK) !== 0) {
          seen.push(`label:${value.label}`);
        }
      },
    });

    expect(seen).toEqual(["count:0", "label:Ada"]);

    state.item.set({ count: 2, label: "Grace" });

    expect(seen).toEqual(["count:0", "label:Ada", "count:2", "label:Grace"]);

    cleanup();
  });

  it("bindExactMasked stays exact-path and ignores descendant-only leaf writes", () => {
    const COUNT_MASK = 1 << 0;
    const LABEL_MASK = 1 << 1;
    const state = pulse({ item: { count: 0, label: "Ada" } });
    const seen: string[] = [];

    const cleanup = bindExactMasked(state.item, {
      fullMask: COUNT_MASK | LABEL_MASK,
      getChangeMask: createObjectKeyMask<{ count: number; label: string }>(
        {
          count: COUNT_MASK,
          label: LABEL_MASK,
        },
        COUNT_MASK | LABEL_MASK,
      ),
      apply(value, mask) {
        if ((mask & COUNT_MASK) !== 0) {
          seen.push(`count:${value.count.toString()}`);
        }

        if ((mask & LABEL_MASK) !== 0) {
          seen.push(`label:${value.label}`);
        }
      },
    });

    state.item.count.set(1);

    expect(seen).toEqual(["count:0", "label:Ada"]);

    cleanup();
  });

  it("createObjectKeyMask resolves known keys and falls back for unknown ones", () => {
    const mask = createObjectKeyMask<{ count: number; label: string }>(
      {
        count: 1 << 0,
        label: 1 << 1,
      },
      (1 << 0) | (1 << 1),
    );

    expect(
      mask([
        {
          kind: "replace",
          path: ["count"],
          key: "count",
          value: 1,
          previousValue: 0,
        },
      ]),
    ).toBe(1 << 0);

    expect(
      mask([
        {
          kind: "replace",
          path: ["other"],
          key: "other",
          value: 1,
          previousValue: 0,
        },
      ]),
    ).toBe((1 << 0) | (1 << 1));
  });

  it("jsx binds pulse children and event listeners", () => {
    const label = pulse("Save");
    let clicked = 0;

    const rendered = jsx("button", {
      className: "action",
      onClick() {
        clicked += 1;
      },
      children: label,
    });

    expect(rendered).toMatchObject({
      node: expect.any(HTMLButtonElement),
    });

    if (
      !(typeof rendered === "object" && rendered !== null && "node" in rendered)
    ) {
      throw new Error("Expected Beat rendered button");
    }

    const button = rendered.node as HTMLButtonElement;

    expect(button.className).toBe("action");
    expect(button.textContent).toBe("Save");

    label.set("Publish");
    button.click();

    expect(button.textContent).toBe("Publish");
    expect(clicked).toBe(1);

    rendered.cleanup?.();
  });

  it("jsx rejects pulse lookalikes that are not authentic pulse nodes", () => {
    const fakePulse = {
      get() {
        return "Save";
      },
      on() {
        return () => {};
      },
    };

    expect(() =>
      jsx("button", {
        children: fakePulse as unknown as Pulse<string>,
      }),
    ).toThrowError("Unsupported Beat JSX child");
  });

  it("jsx applies lowered text, class, style, and property bindings", () => {
    const label = pulse("Save");
    const active = pulse(true);
    const color = pulse("red");
    const title = pulse("Publish item");

    const rendered = jsx("button", {
      __beatText: label,
      __beatClassBindings: {
        active,
      },
      __beatStyleBindings: {
        color,
      },
      __beatPropertyBindings: {
        title,
      },
    });

    if (
      !(typeof rendered === "object" && rendered !== null && "node" in rendered)
    ) {
      throw new Error("Expected Beat rendered button");
    }

    const button = rendered.node as HTMLButtonElement;

    expect(button.textContent).toBe("Save");
    expect(button.classList.contains("active")).toBe(true);
    expect(button.style.getPropertyValue("color")).toBe("red");
    expect(button.title).toBe("Publish item");

    label.set("Publish");
    active.set(false);
    color.set("blue");
    title.set("Published item");

    expect(button.textContent).toBe("Publish");
    expect(button.classList.contains("active")).toBe(false);
    expect(button.style.getPropertyValue("color")).toBe("blue");
    expect(button.title).toBe("Published item");

    rendered.cleanup?.();
  });

  it("bindProperty updates DOM properties from pulses", () => {
    const title = pulse("Ada");
    const element = document.createElement("button");

    const cleanup = bindProperty(element, "title", title);

    expect((element as HTMLButtonElement).title).toBe("Ada");

    title.set("Grace");

    expect((element as HTMLButtonElement).title).toBe("Grace");

    cleanup();
  });

  it("bindProperty updates input value and checkbox state from pulses", () => {
    const value = pulse("Ada");
    const checked = pulse(true);
    const input = document.createElement("input");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const cleanupValue = bindProperty(input, "value", value);
    const cleanupChecked = bindProperty(checkbox, "checked", checked);

    expect(input.value).toBe("Ada");
    expect(checkbox.checked).toBe(true);

    value.set("Grace");
    checked.set(false);

    expect(input.value).toBe("Grace");
    expect(checkbox.checked).toBe(false);

    cleanupValue();
    cleanupChecked();
  });

  it("Show swaps branches and cleans up the previous branch", () => {
    const visible = pulse(true);
    const host = document.createElement("div");
    let trueCleanupCount = 0;

    const rendered = Show({
      when: visible,
      children: () => ({
        node: document.createTextNode("visible"),
        cleanup() {
          trueCleanupCount += 1;
        },
      }),
      fallback: "hidden",
    });

    host.append(rendered.node);

    expect(host.textContent).toBe("visible");

    visible.set(false);

    expect(host.textContent).toBe("hidden");
    expect(trueCleanupCount).toBe(1);

    rendered.cleanup?.();
  });

  it("For remounts keyed rows after reorder and keeps later child updates correct", () => {
    const first = { id: "ada", label: "Ada" };
    const second = { id: "grace", label: "Grace" };
    const rows = pulse([first, second]);
    const host = document.createElement("div");
    let renderCount = 0;

    const rendered = For({
      each: rows,
      key(value) {
        return value.id;
      },
      children(item) {
        renderCount += 1;
        const element = document.createElement("span");
        element.dataset.key = item.id.get();

        const binding = bindText(item.label, (value) => value);
        element.append(binding.node);

        return {
          node: element,
          cleanup: binding.cleanup,
        };
      },
    });

    host.append(rendered.node);

    rows.set([second, first]);

    expect(host.textContent).toBe("GraceAda");

    const firstRowValue = rows.get()[0];

    expect(firstRowValue).toBeDefined();

    if (!firstRowValue) {
      throw new Error("Expected first row pulse to exist.");
    }

    const firstRow = rows[0] as Pulse<{ id: string; label: string }>;

    firstRow.label.set("Amazing Grace");

    expect(host.textContent).toBe("Amazing GraceAda");
    expect(renderCount).toBe(4);

    rendered.cleanup?.();
  });
});

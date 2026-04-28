import { pulse, type Pulse } from "@ochairo/pulse";
import { describe, expect, it } from "vitest";
import { bindProperty, bindStyle, bindText } from "../src/dom.js";
import { jsx } from "../src/jsx-runtime.js";
import { For, Show } from "../src/index.js";

describe("dom bindings", () => {
  it("bindText updates the same text node when the pulse changes", () => {
    const count = pulse(1);
    const binding = bindText(count, (value) => `${value}`);

    expect(binding.node.data).toBe("1");

    count.set(2);

    expect(binding.node.data).toBe("2");

    binding.cleanup?.();
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
        element.dataset["key"] = item.id.get();

        const binding = bindText(item.label, (value) => value);
        element.append(binding.node);

        return binding.cleanup
          ? { node: element, cleanup: binding.cleanup }
          : { node: element };
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

describe("SVG JSX support", () => {
  it("creates SVG elements in the SVG namespace", () => {
    const svgEl = jsx("svg", { viewBox: "0 0 100 100" }) as {
      node: Element;
    };

    expect(svgEl.node).toBeInstanceOf(SVGElement);
    expect(svgEl.node.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svgEl.node.getAttribute("viewBox")).toBe("0 0 100 100");
  });

  it("creates nested SVG child elements in the SVG namespace", () => {
    const rendered = jsx("svg", {
      children: jsx("path", { d: "M0,0 L10,10" }),
    }) as { node: Element };

    const path = rendered.node.firstChild as Element;
    expect(path).toBeInstanceOf(SVGElement);
    expect(path.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(path.getAttribute("d")).toBe("M0,0 L10,10");

    rendered.cleanup?.();
  });

  it("applies static style string to SVG elements", () => {
    const rendered = jsx("svg", {
      style: "display:block",
    }) as { node: SVGElement };

    expect(rendered.node.getAttribute("style")).toBe("display:block");
  });

  it("applies style: reactive bindings to SVG elements", () => {
    const color = pulse("red");
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    const cleanup = bindStyle(svgEl, "color", color);

    expect(svgEl.style.getPropertyValue("color")).toBe("red");

    color.set("blue");

    expect(svgEl.style.getPropertyValue("color")).toBe("blue");

    cleanup();
  });

  it("renders a complete sparkline-style SVG tree via JSX", () => {
    const d = pulse("M0,0 L10,10");
    const stroke = pulse("green");

    const rendered = jsx("svg", {
      viewBox: "0 0 100 32",
      children: jsx("path", {
        fill: "none",
        d,
        stroke,
      }),
    }) as { node: Element; cleanup?: () => void };

    const host = document.createElement("div");
    host.append(rendered.node);

    const path = host.querySelector("path") as Element;
    expect(path.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(path.getAttribute("d")).toBe("M0,0 L10,10");
    expect(path.getAttribute("stroke")).toBe("green");

    d.set("M0,0 L20,5");
    stroke.set("red");

    expect(path.getAttribute("d")).toBe("M0,0 L20,5");
    expect(path.getAttribute("stroke")).toBe("red");

    rendered.cleanup?.();
  });
});

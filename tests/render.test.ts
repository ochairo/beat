import { derived, pulse } from "@ochairo/pulse";
import { describe, expect, it } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import {
  component,
  createRoot,
  onCleanup,
  onMount,
  render,
  Show,
} from "../src/index.js";

describe("render root", () => {
  it("creates a root that replaces the previous rendered scope", () => {
    const target = document.createElement("div");
    const root = createRoot(target);
    let cleanupCount = 0;

    root.render({
      node: document.createTextNode("first"),
      cleanup() {
        cleanupCount += 1;
      },
    });

    expect(root.mounted).toBe(true);
    expect(target.textContent).toBe("first");

    root.render(jsx("span", { children: "second" }));

    expect(cleanupCount).toBe(1);
    expect(target.textContent).toBe("second");

    root.destroy();

    expect(root.mounted).toBe(false);
    expect(target.textContent).toBe("");
  });

  it("render returns a cleanup that tears down reactive content", () => {
    const target = document.createElement("div");
    const visible = pulse(true);

    const cleanup = render(
      target,
      Show({
        when: visible,
        children: "visible",
        fallback: "hidden",
      }),
    );

    expect(target.textContent).toBe("visible");

    visible.set(false);

    expect(target.textContent).toBe("hidden");

    cleanup();
    visible.set(true);

    expect(target.textContent).toBe("");
  });

  it("omits undefined id attributes instead of rendering the string undefined", () => {
    const target = document.createElement("div");

    render(target, jsx("div", { id: undefined, children: "content" }));

    const child = target.firstElementChild as HTMLDivElement | null;
    expect(child).not.toBeNull();
    expect(child?.hasAttribute("id")).toBe(false);
    expect(child?.id).toBe("");
  });

  it("component scope cleanup runs when a root is destroyed", () => {
    const target = document.createElement("div");
    let cleanupCount = 0;

    const Scoped = component(() => {
      onCleanup(() => {
        cleanupCount += 1;
      });

      return jsx("span", { children: "scoped" });
    });

    const root = createRoot(target);
    root.render(jsx(Scoped, {}));

    expect(target.textContent).toBe("scoped");

    root.destroy();

    expect(cleanupCount).toBe(1);
  });
});

describe("onMount", () => {
  it("runs callback asynchronously after component setup", async () => {
    const target = document.createElement("div");
    const order: string[] = [];

    const App = component(() => {
      order.push("setup");

      onMount(() => {
        order.push("mount");
      });

      order.push("return");
      return jsx("span", { children: "hello" });
    });

    render(target, jsx(App, {}));
    order.push("after-render");

    expect(order).toEqual(["setup", "return", "after-render"]);

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(order).toEqual(["setup", "return", "after-render", "mount"]);
  });

  it("has access to the rendered DOM after mount", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    let refElement: Element | undefined;
    let mountedElement: Element | undefined;

    const App = component(() => {
      onMount(() => {
        mountedElement = target.querySelector("span") ?? undefined;
      });

      return jsx("span", {
        children: "content",
        ref: (el: Element) => {
          refElement = el;
        },
      });
    });

    render(target, jsx(App, {}));

    expect(refElement).toBeInstanceOf(HTMLSpanElement);
    expect(mountedElement).toBeUndefined();

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(mountedElement).toBeInstanceOf(HTMLSpanElement);

    document.body.removeChild(target);
  });

  it("throws when called outside a component scope", () => {
    expect(() => {
      onMount(() => {});
    }).toThrow("onMount must run inside a Beat component scope");
  });
});

describe("ref typing", () => {
  it("ref callback receives an Element", () => {
    const target = document.createElement("div");
    let received: Element | undefined;

    const App = component(() => {
      return jsx("div", {
        ref: (el: Element) => {
          received = el;
        },
      });
    });

    render(target, jsx(App, {}));

    expect(received).toBeInstanceOf(HTMLDivElement);
  });

  it("ref callback receives an SVG Element for svg tags", () => {
    const target = document.createElement("div");
    let received: Element | undefined;

    const App = component(() => {
      return jsx("svg", {
        ref: (el: Element) => {
          received = el;
        },
      });
    });

    render(target, jsx(App, {}));

    expect(received).toBeInstanceOf(SVGSVGElement);
  });
});

describe("derived with Show", () => {
  it("Show works with a derived pulse", () => {
    const target = document.createElement("div");
    const count = pulse(0);
    const hasItems = derived(count, (v) => v > 0);

    render(
      target,
      Show({
        when: hasItems,
        children: "has items",
        fallback: "empty",
      }),
    );

    expect(target.textContent).toBe("empty");

    count.set(5);

    expect(target.textContent).toBe("has items");

    count.set(0);

    expect(target.textContent).toBe("empty");
  });

  it("Show fallback re-renders its DOM on repeated toggles (static branch reuse)", () => {
    const target = document.createElement("div");
    const visible = pulse(false);

    const Fallback = component(() => jsx("span", { children: "fallback" }));
    const Content = component(() => jsx("span", { children: "content" }));

    render(
      target,
      Show({
        when: visible,
        children: jsx(Content, {}),
        fallback: jsx(Fallback, {}),
      }),
    );

    // Initially shows fallback
    expect(target.textContent).toBe("fallback");

    // Switch to content
    visible.set(true);
    expect(target.textContent).toBe("content");

    // Back to fallback — static branch must re-appear with its DOM
    visible.set(false);
    expect(target.textContent).toBe("fallback");

    // And again — must keep working on repeated toggles
    visible.set(true);
    expect(target.textContent).toBe("content");

    visible.set(false);
    expect(target.textContent).toBe("fallback");
  });

  it("Show with mapValue re-renders static branches on repeated toggles", () => {
    const target = document.createElement("div");
    const value = pulse<string | null>(null);

    render(
      target,
      Show({
        when: value,
        mapValue: (v) => v !== null,
        children: jsx("span", { children: "active" }),
        fallback: jsx("span", { children: "inactive" }),
      }),
    );

    expect(target.textContent).toBe("inactive");

    value.set("x");
    expect(target.textContent).toBe("active");

    value.set(null);
    expect(target.textContent).toBe("inactive");

    value.set("y");
    expect(target.textContent).toBe("active");

    value.set(null);
    expect(target.textContent).toBe("inactive");
  });
});

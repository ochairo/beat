import { pulse } from "@ochairo/pulse";
import { describe, expect, it } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import {
  component,
  createRoot,
  onCleanup,
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

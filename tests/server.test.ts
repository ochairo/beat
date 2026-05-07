import { pulse } from "@ochairo/pulse";
import { describe, expect, it, vi } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import {
  Outlet,
  Show,
  component,
  createRoot,
  createRouter,
  hydrate,
  onCleanup,
  onMount,
} from "../src/index.js";
import { renderToString, waitForRouter } from "../src/server.js";

describe("renderToString", () => {
  it("serializes a plain element to HTML", () => {
    const html = renderToString(() =>
      jsx("div", { class: "app", children: "hello" }),
    );
    expect(html).toBe('<div class="app">hello</div>');
  });

  it("serializes nested elements", () => {
    const html = renderToString(() =>
      jsx("ul", {
        children: [
          jsx("li", { children: "one" }),
          jsx("li", { children: "two" }),
        ],
      }),
    );
    expect(html).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("serializes a component", () => {
    const Greeting = component(({ name }: { name: string }) =>
      jsx("p", { children: `Hello, ${name}!` }),
    );
    const html = renderToString(() => jsx(Greeting, { name: "world" }));
    expect(html).toBe("<p>Hello, world!</p>");
  });

  it("serializes Show with truthy condition", () => {
    const visible = pulse(true);
    const html = renderToString(() =>
      Show({ when: visible, children: "shown", fallback: "hidden" }),
    );
    expect(html).toContain("shown");
    expect(html).not.toContain("hidden");
  });

  it("serializes Show with falsy condition", () => {
    const visible = pulse(false);
    const html = renderToString(() =>
      Show({ when: visible, children: "shown", fallback: "hidden" }),
    );
    expect(html).not.toContain("shown");
    expect(html).toContain("hidden");
  });

  it("serializes a reactive pulse as its current value", () => {
    const count = pulse(42);
    const html = renderToString(() => jsx("span", { children: count }));
    expect(html).toBe("<span>42</span>");
  });

  it("runs cleanup after serialization", () => {
    let cleaned = false;
    const Spy = component(() => {
      onCleanup(() => {
        cleaned = true;
      });
      return jsx("span", { children: "spy" });
    });

    renderToString(() => jsx(Spy, {}));
    expect(cleaned).toBe(true);
  });
});

describe("createRouter with initialUrl", () => {
  it("resolves route from initialUrl without reading window.location", () => {
    const router = createRouter({
      routes: [
        {
          path: "/blog/:slug",
          view(match) {
            return jsx("h1", { children: match.params["slug"] ?? "" });
          },
        },
      ],
      initialUrl: "https://example.com/blog/hello-world",
    });

    expect(router.current.get().params["slug"]).toBe("hello-world");
    expect(router.current.get().path).toBe("/blog/hello-world");

    router.dispose();
  });

  it("renders the correct outlet content for the initial url", () => {
    const router = createRouter({
      routes: [
        {
          path: "/about",
          view() {
            return jsx("p", { children: "about page" });
          },
        },
      ],
      initialUrl: "https://example.com/about",
    });

    const target = document.createElement("div");
    const root = createRoot(target);
    root.render(Outlet({ router }));

    expect(target.textContent).toBe("about page");

    root.destroy();
    router.dispose();
  });

  it("returns an empty match for unmatched initialUrl", () => {
    const router = createRouter({
      routes: [{ path: "/home", view: () => null }],
      initialUrl: "https://example.com/not-found",
    });

    expect(router.current.get().route).toBeUndefined();
    expect(router.current.get().depth).toBe(-1);

    router.dispose();
  });
});

describe("hydrate", () => {
  it("replaces server HTML atomically with a live Beat tree", () => {
    const target = document.createElement("div");
    // Simulate server-rendered HTML already in the DOM
    target.innerHTML = "<p>server html</p>";

    const count = pulse(1);
    const cleanup = hydrate(target, jsx("p", { children: count }));

    // Server HTML replaced by live tree
    expect(target.textContent).toBe("1");

    // Reactive bindings work after hydration
    count.set(2);
    expect(target.textContent).toBe("2");

    cleanup();
    expect(target.innerHTML).toBe("");
  });

  it("does not leave a blank frame — renders before swapping", () => {
    const target = document.createElement("div");
    target.innerHTML = "<span>initial</span>";

    // Spy on replaceChildren to verify it is called only once
    const replaceChildren = vi.spyOn(target, "replaceChildren");

    hydrate(target, jsx("span", { children: "hydrated" }));

    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(target.textContent).toBe("hydrated");
  });
});

describe("onMount suppressed during renderToString", () => {
  it("does not fire onMount callbacks during renderToString", () => {
    let mounted = false;
    const Spy = component(() => {
      onMount(() => {
        mounted = true;
      });
      return jsx("span", { children: "ok" });
    });

    renderToString(() => jsx(Spy, {}));

    // Flush microtasks — onMount must NOT have been queued
    return Promise.resolve().then(() => {
      expect(mounted).toBe(false);
    });
  });

  it("fires onMount normally outside of renderToString", () => {
    let mounted = false;
    const target = document.createElement("div");
    const Spy = component(() => {
      onMount(() => {
        mounted = true;
      });
      return jsx("span", { children: "ok" });
    });

    const root = createRoot(target);
    root.render(jsx(Spy, {}));

    return Promise.resolve().then(() => {
      expect(mounted).toBe(true);
      root.destroy();
    });
  });
});

describe("waitForRouter", () => {
  it("resolves immediately when no routes have load functions", async () => {
    const router = createRouter({
      routes: [{ path: "/", view: () => null }],
      initialUrl: "https://example.com/",
    });

    await expect(waitForRouter(router)).resolves.toBeUndefined();
    router.dispose();
  });

  it("waits for route load to settle before resolving", async () => {
    let resolveLoad!: (data: string) => void;
    const loadPromise = new Promise<string>((resolve) => {
      resolveLoad = resolve;
    });

    const router = createRouter({
      routes: [
        {
          path: "/data",
          load: () => loadPromise,
          view: (match) =>
            jsx("p", { children: String(match.data ?? "pending") }),
        },
      ],
      initialUrl: "https://example.com/data",
    });

    expect(router.current.get().loading).toBe(true);

    const settled = waitForRouter(router);
    resolveLoad("hello");
    await settled;

    expect(router.current.get().loading).toBe(false);
    expect(router.current.get().data).toBe("hello");
    router.dispose();
  });

  it("resolves after load, renderToString produces loaded content", async () => {
    const router = createRouter({
      routes: [
        {
          path: "/page",
          load: () => Promise.resolve("loaded-value"),
          view: (match) =>
            jsx("p", { children: String(match.data ?? "pending") }),
        },
      ],
      initialUrl: "https://example.com/page",
    });

    await waitForRouter(router);
    const html = renderToString(() => Outlet({ router }));

    expect(html).toContain("loaded-value");
    router.dispose();
  });

  it("rejects with AbortSignal when already aborted before calling", async () => {
    const router = createRouter({
      routes: [
        {
          path: "/slow",
          load: () => new Promise(() => {}), // never resolves
          view: () => null,
        },
      ],
      initialUrl: "https://example.com/slow",
    });

    const controller = new AbortController();
    controller.abort(new Error("cancelled"));

    await expect(
      waitForRouter(router, { signal: controller.signal }),
    ).rejects.toThrow("cancelled");

    router.dispose();
  });

  it("rejects with AbortSignal when aborted after calling", async () => {
    const router = createRouter({
      routes: [
        {
          path: "/slow",
          load: () => new Promise(() => {}), // never resolves
          view: () => null,
        },
      ],
      initialUrl: "https://example.com/slow",
    });

    const controller = new AbortController();
    const settled = waitForRouter(router, { signal: controller.signal });
    controller.abort(new Error("timed out"));

    await expect(settled).rejects.toThrow("timed out");

    router.dispose();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  Link,
  Outlet,
  bindText,
  createDebouncedResource,
  createResource,
  createResourceCache,
  createRoot,
  createRouter,
  createStaleWhileRefreshResource,
} from "../src/index.js";
import { pulse } from "@ochairo/pulse";

function flushPromises(): Promise<void> {
  return Promise.resolve();
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe("router and resource", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("matches params and updates outlet content on navigation", () => {
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/users/:id",
          view(match) {
            const node = document.createElement("span");
            node.textContent = `user:${match.params.id ?? "missing"}`;
            return node;
          },
        },
      ],
      window,
    });

    router.navigate("/users/42?tab=profile", { replace: true });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    expect(router.current.get().params.id).toBe("42");
    expect(router.current.get().query.tab).toBe("profile");
    expect(target.textContent).toBe("user:42");

    router.navigate("/users/7");

    expect(target.textContent).toBe("user:7");

    root.destroy();
    router.dispose();
  });

  it("Link intercepts navigation through the router", () => {
    const router = createRouter({
      routes: [],
      window,
    });

    const rendered = Link({
      router,
      to: "/dashboard",
      children: "Dashboard",
    });

    if (
      !(typeof rendered === "object" && rendered !== null && "node" in rendered)
    ) {
      throw new Error("Expected rendered link");
    }

    const anchor = rendered.node as HTMLAnchorElement;
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    expect(router.current.get().path).toBe("/dashboard");

    rendered.cleanup?.();
    router.dispose();
  });

  it("Link can prefetch on hover before navigation", async () => {
    const target = document.createElement("div");
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          async load() {
            loads += 1;
            return `prefetched:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    const rendered = Link({
      router,
      to: "/dashboard",
      prefetch: "hover",
      children: "Dashboard",
    });

    if (
      !(typeof rendered === "object" && rendered !== null && "node" in rendered)
    ) {
      throw new Error("Expected rendered link");
    }

    const anchor = rendered.node as HTMLAnchorElement;
    anchor.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await flushPromises();
    await flushPromises();

    expect(loads).toBe(1);
    expect(router.current.get().path).toBe("/");

    rendered.cleanup?.();
    root.destroy();
    router.dispose();
  });

  it("Link can prefetch on focus before navigation", async () => {
    const target = document.createElement("div");
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          async load() {
            loads += 1;
            return `focused:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    const rendered = Link({
      router,
      to: "/dashboard",
      prefetch: "focus",
      children: "Dashboard",
    });

    if (
      !(typeof rendered === "object" && rendered !== null && "node" in rendered)
    ) {
      throw new Error("Expected rendered link");
    }

    const anchor = rendered.node as HTMLAnchorElement;
    anchor.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    await flushPromises();
    await flushPromises();

    expect(loads).toBe(1);
    expect(router.current.get().path).toBe("/");

    rendered.cleanup?.();
    root.destroy();
    router.dispose();
  });

  it("Link does not intercept external urls", () => {
    const router = createRouter({
      routes: [],
      window,
    });

    const rendered = Link({
      router,
      to: "https://example.com/docs",
      children: "External",
    });

    if (
      !(typeof rendered === "object" && rendered !== null && "node" in rendered)
    ) {
      throw new Error("Expected rendered link");
    }

    const anchor = rendered.node as HTMLAnchorElement;
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
    });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    expect(router.current.get().path).toBe("/");
    expect(anchor.getAttribute("href")).toBe("https://example.com/docs");

    rendered.cleanup?.();
    router.dispose();
  });

  it("Link does not intercept target or download navigations", () => {
    const router = createRouter({
      routes: [],
      window,
    });

    const targetLink = Link({
      router,
      to: "/docs",
      target: "_blank",
      children: "Docs",
    });
    const downloadLink = Link({
      router,
      to: "/archive.zip",
      download: true,
      children: "Download",
    });

    if (
      !(
        typeof targetLink === "object" &&
        targetLink !== null &&
        "node" in targetLink
      )
    ) {
      throw new Error("Expected rendered target link");
    }

    if (
      !(
        typeof downloadLink === "object" &&
        downloadLink !== null &&
        "node" in downloadLink
      )
    ) {
      throw new Error("Expected rendered download link");
    }

    const targetEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    const downloadEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    (targetLink.node as HTMLAnchorElement).addEventListener(
      "click",
      (event) => {
        event.preventDefault();
      },
    );
    (downloadLink.node as HTMLAnchorElement).addEventListener(
      "click",
      (event) => {
        event.preventDefault();
      },
    );

    (targetLink.node as HTMLAnchorElement).dispatchEvent(targetEvent);
    (downloadLink.node as HTMLAnchorElement).dispatchEvent(downloadEvent);

    expect(router.current.get().path).toBe("/");

    targetLink.cleanup?.();
    downloadLink.cleanup?.();
    router.dispose();
  });

  it("router redirects and guards before committing navigation", () => {
    const target = document.createElement("div");
    const authenticated = pulse(false);
    const router = createRouter({
      routes: [
        {
          path: "/login",
          view() {
            return document.createTextNode("login");
          },
        },
        {
          path: "/legacy",
          redirectTo: "/home",
          view() {
            return document.createTextNode("legacy");
          },
        },
        {
          path: "/home",
          view() {
            return document.createTextNode("home");
          },
        },
        {
          path: "/private",
          beforeEnter() {
            return authenticated.get() ? true : "/login";
          },
          view() {
            return document.createTextNode("private");
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/legacy");
    expect(router.current.get().path).toBe("/home");
    expect(target.textContent).toBe("home");

    router.navigate("/private");
    expect(router.current.get().path).toBe("/login");
    expect(target.textContent).toBe("login");

    authenticated.set(true);
    router.navigate("/private");
    expect(router.current.get().path).toBe("/private");
    expect(target.textContent).toBe("private");

    root.destroy();
    router.dispose();
  });

  it("router supports nested layouts through outlet composition", () => {
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");
            layout.dataset.role = "layout";
            layout.append(document.createTextNode("layout:"));

            const child = match.outlet();
            if (
              child &&
              typeof child === "object" &&
              child !== null &&
              "node" in child
            ) {
              layout.append(child.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports",
              view() {
                return document.createTextNode("reports");
              },
            },
          ],
        },
      ],
      window,
    });

    router.navigate("/dashboard/reports", { replace: true });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    expect(target.textContent).toBe("layout:reports");

    root.destroy();
    router.dispose();
  });

  it("router supports named outlets with independent branch loaders", async () => {
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");
            layout.append(document.createTextNode("main:"));

            const main = match.outlet();
            if (
              main &&
              typeof main === "object" &&
              main !== null &&
              "node" in main
            ) {
              layout.append(main.node);
            }

            layout.append(document.createTextNode("|side:"));

            const sidebar = match.outlet("sidebar");
            if (
              sidebar &&
              typeof sidebar === "object" &&
              sidebar !== null &&
              "node" in sidebar
            ) {
              layout.append(sidebar.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports",
              view() {
                return document.createTextNode("reports");
              },
            },
            {
              path: "reports",
              outlet: "sidebar",
              async load() {
                return "filters";
              },
              view(match) {
                return document.createTextNode(String(match.data ?? "pending"));
              },
            },
          ],
        },
      ],
      window,
    });

    router.navigate("/dashboard/reports", { replace: true });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    expect(target.textContent).toBe("main:reports|side:pending");

    await flushPromises();
    await flushPromises();

    expect(target.textContent).toBe("main:reports|side:filters");

    root.destroy();
    router.dispose();
  });

  it("router errorView isolates outlet failures per branch", async () => {
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");
            layout.append(document.createTextNode("main:"));

            const main = match.outlet();
            if (
              main &&
              typeof main === "object" &&
              main !== null &&
              "node" in main
            ) {
              layout.append(main.node);
            }

            layout.append(document.createTextNode("|side:"));

            const sidebar = match.outlet("sidebar");
            if (
              sidebar &&
              typeof sidebar === "object" &&
              sidebar !== null &&
              "node" in sidebar
            ) {
              layout.append(sidebar.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports",
              view() {
                return document.createTextNode("reports");
              },
            },
            {
              path: "reports",
              outlet: "sidebar",
              async load() {
                throw new Error("sidebar failed");
              },
              errorView(error) {
                return document.createTextNode((error as Error).message);
              },
              view(match) {
                return document.createTextNode(String(match.data ?? "pending"));
              },
            },
          ],
        },
      ],
      window,
    });

    router.navigate("/dashboard/reports", { replace: true });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    await flushPromises();
    await flushPromises();

    expect(target.textContent).toBe("main:reports|side:sidebar failed");

    root.destroy();
    router.dispose();
  });

  it("router reports load and render errors through diagnostics hook", async () => {
    const seen: string[] = [];
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/broken-load",
          async load() {
            throw new Error("load failed");
          },
          errorView() {
            return document.createTextNode("load fallback");
          },
          view() {
            return document.createTextNode("never");
          },
        },
        {
          path: "/broken-render",
          errorView(error) {
            return document.createTextNode((error as Error).message);
          },
          view() {
            throw new Error("render failed");
          },
        },
      ],
      window,
      onError(event) {
        seen.push(`${event.phase}:${(event.error as Error).message}`);
      },
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/broken-load", { replace: true });
    await flushPromises();
    await flushPromises();

    router.navigate("/broken-render", { replace: true });

    expect(seen).toEqual(["load:load failed", "render:render failed"]);

    root.destroy();
    router.dispose();
  });

  it("router diagnostics include outlet metadata for named branch failures", async () => {
    const seen: Array<{
      phase: string;
      outlet: string | undefined;
      path: string;
    }> = [];
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");

            const main = match.outlet();
            if (
              main &&
              typeof main === "object" &&
              main !== null &&
              "node" in main
            ) {
              layout.append(main.node);
            }

            const sidebar = match.outlet("sidebar");
            if (
              sidebar &&
              typeof sidebar === "object" &&
              sidebar !== null &&
              "node" in sidebar
            ) {
              layout.append(sidebar.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports",
              view() {
                return document.createTextNode("reports");
              },
            },
            {
              path: "reports",
              outlet: "sidebar",
              async load() {
                throw new Error("sidebar load failed");
              },
              errorView() {
                return document.createTextNode("sidebar fallback");
              },
              view() {
                return document.createTextNode("sidebar");
              },
            },
          ],
        },
      ],
      window,
      onError(event) {
        seen.push({
          phase: event.phase,
          outlet: event.outlet,
          path: event.match.path,
        });
      },
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/dashboard/reports", { replace: true });
    await flushPromises();
    await flushPromises();

    expect(seen).toEqual([
      {
        phase: "load",
        outlet: "sidebar",
        path: "/dashboard/reports",
      },
    ]);

    root.destroy();
    router.dispose();
  });

  it("router loads route data for matched branches", async () => {
    const target = document.createElement("div");
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            return `loaded:${match.params.id ?? "missing"}`;
          },
          view(match) {
            const node = document.createElement("span");
            node.textContent = String(match.data ?? "pending");
            return node;
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/reports/88", { replace: true });

    expect(router.current.get().loading).toBe(true);
    await flushPromises();
    await flushPromises();

    expect(router.current.get().status).toBe("resolved");
    expect(router.current.get().data).toBe("loaded:88");
    expect(router.current.get().routeData[0]?.data).toBe("loaded:88");
    expect(target.textContent).toBe("loaded:88");

    root.destroy();
    router.dispose();
  });

  it("router reload reruns the current route loader", async () => {
    const target = document.createElement("div");
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            loads += 1;
            return `loaded:${match.params.id ?? "missing"}:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/reports/3", { replace: true });
    await flushPromises();
    await flushPromises();

    expect(target.textContent).toBe("loaded:3:1");
    expect(router.current.get().status).toBe("resolved");

    router.reload();

    expect(router.current.get().path).toBe("/reports/3");
    expect(router.current.get().status).toBe("pending");
    expect(target.textContent).toBe("pending");

    await flushPromises();
    await flushPromises();

    expect(loads).toBe(2);
    expect(router.current.get().status).toBe("resolved");
    expect(target.textContent).toBe("loaded:3:2");

    root.destroy();
    router.dispose();
  });

  it("router prefetch warms route loaders without navigating", async () => {
    const target = document.createElement("div");
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            loads += 1;
            return `loaded:${match.params.id ?? "missing"}:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    await router.prefetch("/reports/11");

    expect(router.current.get().path).toBe("/");
    expect(loads).toBe(1);
    expect(target.textContent).toBe("");

    router.navigate("/reports/11", { replace: true });

    expect(router.current.get().status).toBe("resolved");
    expect(router.current.get().data).toBe("loaded:11:1");
    expect(target.textContent).toBe("loaded:11:1");
    expect(loads).toBe(1);

    root.destroy();
    router.dispose();
  });

  it("router recovers from loader rejection on retry", async () => {
    const target = document.createElement("div");
    let shouldFail = true;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            if (shouldFail) {
              throw new Error(`failed:${match.params.id ?? "missing"}`);
            }

            return `loaded:${match.params.id ?? "missing"}`;
          },
          errorView(error) {
            return document.createTextNode((error as Error).message);
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/reports/5", { replace: true });
    await flushPromises();
    await flushPromises();

    expect(router.current.get().status).toBe("rejected");
    expect(target.textContent).toBe("failed:5");

    shouldFail = false;
    router.reload();

    expect(router.current.get().status).toBe("pending");
    expect(target.textContent).toBe("pending");

    await flushPromises();
    await flushPromises();

    expect(router.current.get().status).toBe("resolved");
    expect(router.current.get().data).toBe("loaded:5");
    expect(target.textContent).toBe("loaded:5");

    root.destroy();
    router.dispose();
  });

  it("router reload reruns named outlet loaders for the current route", async () => {
    const target = document.createElement("div");
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");
            layout.append(document.createTextNode("main:"));

            const main = match.outlet();
            if (
              main &&
              typeof main === "object" &&
              main !== null &&
              "node" in main
            ) {
              layout.append(main.node);
            }

            layout.append(document.createTextNode("|side:"));

            const sidebar = match.outlet("sidebar");
            if (
              sidebar &&
              typeof sidebar === "object" &&
              sidebar !== null &&
              "node" in sidebar
            ) {
              layout.append(sidebar.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports/:id",
              view(match) {
                return document.createTextNode(
                  `report:${match.params.id ?? "missing"}`,
                );
              },
            },
            {
              path: "reports/:id",
              outlet: "sidebar",
              async load(match) {
                loads += 1;
                return `filters:${match.params.id ?? "missing"}:${loads}`;
              },
              view(match) {
                return document.createTextNode(String(match.data ?? "pending"));
              },
            },
          ],
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/dashboard/reports/8", { replace: true });
    await flushPromises();
    await flushPromises();

    expect(target.textContent).toBe("main:report:8|side:filters:8:1");

    router.reload();

    expect(target.textContent).toBe("main:report:8|side:pending");

    await flushPromises();
    await flushPromises();

    expect(loads).toBe(2);
    expect(target.textContent).toBe("main:report:8|side:filters:8:2");

    root.destroy();
    router.dispose();
  });

  it("router prefetch warms named outlet loaders without navigating", async () => {
    const target = document.createElement("div");
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");
            layout.append(document.createTextNode("main:"));

            const main = match.outlet();
            if (
              main &&
              typeof main === "object" &&
              main !== null &&
              "node" in main
            ) {
              layout.append(main.node);
            }

            layout.append(document.createTextNode("|side:"));

            const sidebar = match.outlet("sidebar");
            if (
              sidebar &&
              typeof sidebar === "object" &&
              sidebar !== null &&
              "node" in sidebar
            ) {
              layout.append(sidebar.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports/:id",
              view(match) {
                return document.createTextNode(
                  `report:${match.params.id ?? "missing"}`,
                );
              },
            },
            {
              path: "reports/:id",
              outlet: "sidebar",
              async load(match) {
                loads += 1;
                return `filters:${match.params.id ?? "missing"}:${loads}`;
              },
              view(match) {
                return document.createTextNode(String(match.data ?? "pending"));
              },
            },
          ],
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    await router.prefetch("/dashboard/reports/4");

    expect(router.current.get().path).toBe("/");
    expect(loads).toBe(1);
    expect(target.textContent).toBe("");

    router.navigate("/dashboard/reports/4", { replace: true });

    expect(target.textContent).toBe("main:report:4|side:filters:4:1");
    expect(loads).toBe(1);

    root.destroy();
    router.dispose();
  });

  it("router prefetch cache evicts oldest entries when bounded", async () => {
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            loads += 1;
            return `loaded:${match.params.id ?? "missing"}:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      prefetchCacheMaxEntries: 1,
      window,
    });

    await router.prefetch("/reports/1");
    await router.prefetch("/reports/2");

    expect(loads).toBe(2);

    router.navigate("/reports/1", { replace: true });
    expect(router.current.get().status).toBe("pending");

    await flushPromises();
    await flushPromises();

    expect(loads).toBe(3);
    expect(router.current.get().data).toBe("loaded:1:3");

    router.dispose();
  });

  it("router can invalidate specific prefetched routes", async () => {
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            loads += 1;
            return `loaded:${match.params.id ?? "missing"}:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    await router.prefetch("/reports/6");
    router.invalidatePrefetch("/reports/6");
    router.navigate("/reports/6", { replace: true });

    expect(router.current.get().status).toBe("pending");

    await flushPromises();
    await flushPromises();

    expect(loads).toBe(2);
    expect(router.current.get().data).toBe("loaded:6:2");

    router.dispose();
  });

  it("router invalidation aborts in-flight prefetches and prevents reuse", async () => {
    const prefetched = createDeferred<string>();
    const aborted: string[] = [];
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          load(match, signal) {
            const id = match.params.id ?? "missing";
            loads += 1;
            signal.addEventListener("abort", () => {
              aborted.push(id);
            });

            if (loads === 1) {
              return prefetched.promise;
            }

            return Promise.resolve(`loaded:${id}:${loads}`);
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    void router.prefetch("/reports/12");
    await flushPromises();

    router.invalidatePrefetch("/reports/12");
    expect(aborted).toEqual(["12"]);

    prefetched.resolve("loaded:12:stale");
    await flushPromises();
    await flushPromises();

    router.navigate("/reports/12", { replace: true });
    expect(router.current.get().status).toBe("pending");

    await flushPromises();
    await flushPromises();

    expect(loads).toBe(2);
    expect(router.current.get().data).toBe("loaded:12:2");

    router.dispose();
  });

  it("router invalidatePrefetch without arguments clears all cached and active prefetches", async () => {
    const firstPrefetch = createDeferred<string>();
    const secondPrefetch = createDeferred<string>();
    const aborted: string[] = [];
    let loads = 0;
    let firstPrefetchPending = true;
    let secondPrefetchPending = true;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          load(match, signal) {
            const id = match.params.id ?? "missing";
            loads += 1;
            signal.addEventListener("abort", () => {
              aborted.push(id);
            });

            if (id === "1" && firstPrefetchPending) {
              firstPrefetchPending = false;
              return firstPrefetch.promise;
            }

            if (id === "2" && secondPrefetchPending) {
              secondPrefetchPending = false;
              return secondPrefetch.promise;
            }

            return Promise.resolve(`loaded:${id}:${loads}`);
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    void router.prefetch("/reports/1");
    void router.prefetch("/reports/2");
    await flushPromises();

    router.invalidatePrefetch();
    expect(aborted.sort()).toEqual(["1", "2"]);

    firstPrefetch.resolve("stale:1");
    secondPrefetch.resolve("stale:2");
    await flushPromises();
    await flushPromises();

    router.navigate("/reports/2", { replace: true });
    await flushPromises();
    await flushPromises();

    expect(loads).toBe(3);
    expect(router.current.get().data).toBe("loaded:2:3");

    router.dispose();
  });

  it("router can retry a failed prefetch and reuse the successful result", async () => {
    let shouldFail = true;
    let loads = 0;
    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          async load(match) {
            loads += 1;

            if (shouldFail) {
              throw new Error(
                `prefetch failed:${match.params.id ?? "missing"}`,
              );
            }

            return `loaded:${match.params.id ?? "missing"}:${loads}`;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    await expect(router.prefetch("/reports/13")).rejects.toThrow(
      "prefetch failed:13",
    );

    shouldFail = false;
    await router.prefetch("/reports/13");
    router.navigate("/reports/13", { replace: true });

    expect(router.current.get().status).toBe("resolved");
    expect(router.current.get().data).toBe("loaded:13:2");
    expect(loads).toBe(2);

    router.dispose();
  });

  it("router ignores stale loader results after a newer navigation", async () => {
    const target = document.createElement("div");
    const firstLoad = createDeferred<string>();
    const secondLoad = createDeferred<string>();
    const aborted: string[] = [];

    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          load(match, signal) {
            const id = match.params.id ?? "missing";
            signal.addEventListener("abort", () => {
              aborted.push(id);
            });

            if (id === "1") {
              return firstLoad.promise;
            }

            return secondLoad.promise;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/reports/1", { replace: true });
    expect(target.textContent).toBe("pending");

    router.navigate("/reports/2", { replace: true });
    expect(aborted).toEqual(["1"]);

    firstLoad.resolve("loaded:1");
    await flushPromises();
    await flushPromises();

    expect(router.current.get().path).toBe("/reports/2");
    expect(router.current.get().status).toBe("pending");
    expect(target.textContent).toBe("pending");

    secondLoad.resolve("loaded:2");
    await flushPromises();
    await flushPromises();

    expect(router.current.get().path).toBe("/reports/2");
    expect(router.current.get().status).toBe("resolved");
    expect(router.current.get().data).toBe("loaded:2");
    expect(target.textContent).toBe("loaded:2");

    root.destroy();
    router.dispose();
  });

  it("router ignores stale named outlet loader results after a newer navigation", async () => {
    const target = document.createElement("div");
    const firstLoad = createDeferred<string>();
    const secondLoad = createDeferred<string>();
    const aborted: string[] = [];

    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          view(match) {
            const layout = document.createElement("section");
            layout.append(document.createTextNode("main:"));

            const main = match.outlet();
            if (
              main &&
              typeof main === "object" &&
              main !== null &&
              "node" in main
            ) {
              layout.append(main.node);
            }

            layout.append(document.createTextNode("|side:"));

            const sidebar = match.outlet("sidebar");
            if (
              sidebar &&
              typeof sidebar === "object" &&
              sidebar !== null &&
              "node" in sidebar
            ) {
              layout.append(sidebar.node);
            }

            return layout;
          },
          children: [
            {
              path: "reports/:id",
              view(match) {
                return document.createTextNode(
                  `report:${match.params.id ?? "missing"}`,
                );
              },
            },
            {
              path: "reports/:id",
              outlet: "sidebar",
              load(match, signal) {
                const id = match.params.id ?? "missing";
                signal.addEventListener("abort", () => {
                  aborted.push(id);
                });

                if (id === "1") {
                  return firstLoad.promise;
                }

                return secondLoad.promise;
              },
              view(match) {
                return document.createTextNode(String(match.data ?? "pending"));
              },
            },
          ],
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/dashboard/reports/1", { replace: true });
    expect(target.textContent).toBe("main:report:1|side:pending");

    router.navigate("/dashboard/reports/2", { replace: true });
    expect(aborted).toEqual(["1"]);

    firstLoad.resolve("filters:1");
    await flushPromises();
    await flushPromises();

    expect(router.current.get().path).toBe("/dashboard/reports/2");
    expect(target.textContent).toBe("main:report:2|side:pending");

    secondLoad.resolve("filters:2");
    await flushPromises();
    await flushPromises();

    expect(target.textContent).toBe("main:report:2|side:filters:2");

    root.destroy();
    router.dispose();
  });

  it("router dispose aborts in-flight loaders", async () => {
    const target = document.createElement("div");
    const load = createDeferred<string>();
    const aborted: string[] = [];

    const router = createRouter({
      routes: [
        {
          path: "/reports/:id",
          load(match, signal) {
            const id = match.params.id ?? "missing";
            signal.addEventListener("abort", () => {
              aborted.push(id);
            });
            return load.promise;
          },
          view(match) {
            return document.createTextNode(String(match.data ?? "pending"));
          },
        },
      ],
      window,
    });

    const root = createRoot(target);
    root.render(Outlet({ router }));

    router.navigate("/reports/9", { replace: true });
    router.dispose();

    expect(aborted).toEqual(["9"]);

    load.resolve("loaded:9");
    await flushPromises();
    await flushPromises();

    expect(router.current.get().status).toBe("pending");
    expect(target.textContent).toBe("pending");

    root.destroy();
  });

  it("createResource reloads from source changes", async () => {
    const source = pulse("ada");
    const resource = createResource({
      source,
      immediate: false,
      load: async (value) => value.toUpperCase(),
    });

    await resource.reload();

    expect(resource.state.get().status).toBe("resolved");
    expect(resource.state.get().data).toBe("ADA");

    source.set("grace");
    await flushPromises();
    await flushPromises();

    expect(resource.state.get().data).toBe("GRACE");

    resource.dispose();
  });

  it("createResource supports manual reload without a source pulse", async () => {
    let loads = 0;
    const resource = createResource<void, string>({
      immediate: false,
      load: async () => {
        loads += 1;
        return `manual:${loads}`;
      },
    });

    expect(resource.state.get().status).toBe("idle");

    await resource.reload();

    expect(loads).toBe(1);
    expect(resource.state.get().status).toBe("resolved");
    expect(resource.state.get().data).toBe("manual:1");

    await resource.reload();

    expect(loads).toBe(2);
    expect(resource.state.get().data).toBe("manual:2");

    resource.dispose();
  });

  it("createResource supports immediate execution without a source pulse", async () => {
    let loads = 0;
    const resource = createResource<void, string>({
      load: async () => {
        loads += 1;
        return `immediate:${loads}`;
      },
    });

    await flushPromises();
    await flushPromises();

    expect(loads).toBe(1);
    expect(resource.state.get().status).toBe("resolved");
    expect(resource.state.get().data).toBe("immediate:1");

    resource.dispose();
  });

  it("manual resources can reuse cached values", async () => {
    let loads = 0;
    const resource = createResource<void, string>({
      immediate: false,
      getCacheKey() {
        return "manual";
      },
      load: async () => {
        loads += 1;
        return `manual:${loads}`;
      },
    });

    await resource.reload();
    expect(resource.state.get().data).toBe("manual:1");
    expect(loads).toBe(1);

    await resource.reload();
    expect(resource.state.get().data).toBe("manual:1");
    expect(loads).toBe(1);

    resource.invalidate("manual");
    await resource.reload();
    expect(resource.state.get().data).toBe("manual:2");
    expect(loads).toBe(2);

    resource.dispose();
  });

  it("resource state works with existing Beat text binding", async () => {
    const source = pulse(2);
    const resource = createResource({
      source,
      immediate: false,
      load: async (value) => value * 3,
    });

    const rendered = bindText(resource.state.data, (value) =>
      String(value ?? "pending"),
    );

    expect(rendered.node.data).toBe("pending");

    await resource.reload();

    expect(rendered.node.data).toBe("6");

    rendered.cleanup?.();
    resource.dispose();
  });

  it("debounced resources coalesce rapid source changes", async () => {
    const source = pulse("a");
    const seen: string[] = [];
    const resource = createDebouncedResource({
      source,
      debounceMs: 5,
      immediate: false,
      load: async (value) => {
        seen.push(value);
        return value.toUpperCase();
      },
    });

    source.set("b");
    source.set("c");

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(seen).toEqual(["c"]);
    expect(resource.state.get().data).toBe("C");

    resource.dispose();
  });

  it("debounced resource reload promises settle after rescheduling", async () => {
    const source = pulse("a");
    const seen: string[] = [];
    const resource = createDebouncedResource({
      source,
      debounceMs: 5,
      immediate: false,
      load: async (value) => {
        seen.push(value);
        return value.toUpperCase();
      },
    });

    const firstReload = resource.reload();
    source.set("b");
    const secondReload = resource.reload();

    await Promise.all([firstReload, secondReload]);

    expect(seen).toEqual(["b"]);
    expect(resource.state.get().data).toBe("B");

    resource.dispose();
  });

  it("debounced resource reload promises settle on dispose", async () => {
    const source = pulse("a");
    const resource = createDebouncedResource({
      source,
      debounceMs: 50,
      immediate: false,
      load: async (value) => value.toUpperCase(),
    });

    let settled = false;
    const pendingReload = resource.reload().then(() => {
      settled = true;
    });

    resource.dispose();
    await pendingReload;

    expect(settled).toBe(true);
    expect(resource.state.get().status).toBe("idle");
  });

  it("stale-while-refresh resources preserve previous data while pending", async () => {
    const source = pulse(1);
    let releaseLoad: (() => void) | undefined;
    const resource = createStaleWhileRefreshResource({
      source,
      immediate: false,
      load: async (value) => {
        await new Promise<void>((resolve) => {
          releaseLoad = resolve;
        });
        return value * 10;
      },
    });

    const firstReload = resource.reload();
    releaseLoad?.();
    await firstReload;

    expect(resource.state.get().data).toBe(10);

    source.set(2);
    await flushPromises();

    expect(resource.state.get().loading).toBe(true);
    expect(resource.state.get().data).toBe(10);

    releaseLoad?.();
    await flushPromises();
    await flushPromises();

    expect(resource.state.get().data).toBe(20);

    resource.dispose();
  });

  it("resource cache keys reuse resolved values until invalidated", async () => {
    const source = pulse("ada");
    let loads = 0;
    const resource = createResource({
      source,
      immediate: false,
      getCacheKey(value) {
        return value;
      },
      load: async (value) => {
        loads += 1;
        return value.toUpperCase();
      },
    });

    await resource.reload();
    expect(resource.state.get().data).toBe("ADA");
    expect(loads).toBe(1);

    source.set("ada");
    await flushPromises();

    expect(resource.state.get().data).toBe("ADA");
    expect(loads).toBe(1);

    resource.invalidate("ada");
    await resource.reload();

    expect(loads).toBe(2);

    resource.dispose();
  });

  it("shared resource caches can be reused across resources and evict old entries", async () => {
    const cache = createResourceCache<string>({ maxEntries: 1 });
    let firstLoads = 0;
    let secondLoads = 0;
    const firstSource = pulse("alpha");
    const secondSource = pulse("beta");

    const first = createResource({
      source: firstSource,
      cache,
      immediate: false,
      getCacheKey(value) {
        return value;
      },
      load: async (value) => {
        firstLoads += 1;
        return value.toUpperCase();
      },
    });

    await first.reload();
    expect(first.state.get().data).toBe("ALPHA");
    expect(firstLoads).toBe(1);

    const second = createResource({
      source: secondSource,
      cache,
      immediate: false,
      getCacheKey(value) {
        return value;
      },
      load: async (value) => {
        secondLoads += 1;
        return value.toUpperCase();
      },
    });

    await second.reload();
    expect(second.state.get().data).toBe("BETA");
    expect(secondLoads).toBe(1);

    await first.reload();
    expect(firstLoads).toBe(2);

    first.dispose();
    second.dispose();
  });

  it("resource caches keep recently read entries under lru eviction", () => {
    const cache = createResourceCache<string>({
      maxEntries: 2,
      eviction: "lru",
    });

    cache.set("first", "Ada");
    cache.set("second", "Grace");

    expect(cache.get("first")).toBe("Ada");

    cache.set("third", "Linus");

    expect(cache.get("first")).toBe("Ada");
    expect(cache.get("second")).toBeUndefined();
    expect(cache.get("third")).toBe("Linus");
  });

  it("resource caches support namespaces and default TTL", async () => {
    const cache = createResourceCache<string>({ defaultCacheTimeMs: 5 });
    const usersCache = cache.namespace("users");
    const postsCache = cache.namespace("posts");

    usersCache.set("1", "ada");
    postsCache.set("1", "post-1");

    expect(usersCache.get("1")).toBe("ada");
    expect(postsCache.get("1")).toBe("post-1");

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(usersCache.get("1")).toBeUndefined();
    expect(postsCache.get("1")).toBeUndefined();
  });

  it("resource caches support fifo eviction", () => {
    const cache = createResourceCache<string>({
      maxEntries: 2,
      eviction: "fifo",
    });

    cache.set("first", "Ada");
    cache.set("second", "Grace");
    expect(cache.get("first")).toBe("Ada");

    cache.set("third", "Linus");

    expect(cache.get("first")).toBeUndefined();
    expect(cache.get("second")).toBe("Grace");
    expect(cache.get("third")).toBe("Linus");
  });

  it("resource caches support pruneExpired and size", async () => {
    const cache = createResourceCache<string>({ defaultCacheTimeMs: 5 });

    cache.set("first", "Ada");
    cache.set("second", "Grace");

    expect(cache.size()).toBe(2);

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(cache.pruneExpired()).toBe(2);
    expect(cache.size()).toBe(0);
  });

  it("resource cache size and pruneExpired are namespace scoped", async () => {
    const cache = createResourceCache<string>({ defaultCacheTimeMs: 5 });
    const users = cache.namespace("users");
    const posts = cache.namespace("posts");

    users.set("1", "Ada");
    posts.set("1", "Post 1");

    expect(users.size()).toBe(1);
    expect(posts.size()).toBe(1);
    expect(cache.size()).toBe(2);

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(users.pruneExpired()).toBe(1);
    expect(users.size()).toBe(0);
    expect(posts.size()).toBe(0);
    expect(cache.size()).toBe(0);
  });
});

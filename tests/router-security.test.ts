import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, createRouter, Outlet } from "../src/index.js";
import { jsx } from "../src/jsx-runtime.js";
import { renderToString } from "../src/server.js";

describe("route admission", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it.each([false, true])("never publishes an initially denied route (SSR=%s)", (ssr) => {
    window.history.replaceState(null, "", "/private");
    const view = vi.fn(() => "secret");
    const load = vi.fn(async () => "secret");
    const router = createRouter({
      routes: [
        { path: "/private", beforeEnter: () => false, view, load },
        { path: "/public", view: () => "public" },
      ],
      ...(ssr ? { initialUrl: "https://example.com/private" } : { window }),
    });
    expect(router.current.get().matches).toEqual([]);
    expect(router.current.get().route).toBeUndefined();
    expect(renderToString(() => Outlet({ router }))).not.toContain("secret");
    expect(view).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    router.navigate("/public");
    expect(renderToString(() => Outlet({ router }))).toContain("public");
    router.dispose();
  });

  it.each(["parent", "named"] as const)("checks %s guards before navigation, prefetch, and popstate effects", async (denied) => {
    const calls: string[] = [];
    const load = vi.fn(async () => "secret");
    const view = vi.fn(() => "secret");
    const router = createRouter({
      routes: [
        { path: "/", view: () => "public" },
        {
          path: "/secure",
          beforeEnter({ to }) {
            calls.push(`parent:${to.route?.path}:${to.depth}`);
            return denied !== "parent";
          },
          load,
          view: (match) => jsx("div", { children: [match.outlet(), match.outlet("tools")] }),
          children: [
            { path: "page", beforeEnter: () => { calls.push("leaf"); }, load, view },
            { path: "page", outlet: "tools", beforeEnter: () => { calls.push("named"); return false; }, load, view },
          ],
        },
      ],
      window,
    });
    const target = document.createElement("div");
    const root = createRoot(target);
    root.render(Outlet({ router }));
    router.navigate("/secure/page");
    await router.prefetch("/secure/page");
    window.history.pushState(null, "", "/secure/page");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(window.location.pathname).toBe("/");
    expect(target.textContent).toBe("public");
    expect(load).not.toHaveBeenCalled();
    expect(view).not.toHaveBeenCalled();
    const sequence = denied === "parent" ? ["parent:/secure:0"] : ["parent:/secure:0", "leaf", "named"];
    expect(calls).toEqual([...sequence, ...sequence, ...sequence]);
    root.destroy();
    router.dispose();
  });

  it("recomputes branches after a parent guard redirects", () => {
    const denied = vi.fn(() => "secret");
    const router = createRouter({
      initialUrl: "https://example.com/private/page",
      routes: [
        { path: "/login", view: () => "login" },
        { path: "/private", beforeEnter: () => "/login", view: denied, children: [{ path: "page", view: denied }] },
      ],
    });
    expect(router.current.get().path).toBe("/login");
    expect(renderToString(() => Outlet({ router }))).toContain("login");
    expect(denied).not.toHaveBeenCalled();
    router.dispose();
  });

  it("rechecks guards before using prefetched data", async () => {
    let allowed = true;
    const load = vi.fn(async () => "secret");
    const view = vi.fn(() => "secret");
    const router = createRouter({
      routes: [{ path: "/private", beforeEnter: () => allowed, load, view }], window,
    });
    await router.prefetch("/private");
    expect(load).toHaveBeenCalledTimes(1);
    allowed = false;
    router.navigate("/private");
    expect(router.current.get().route).toBeUndefined();
    expect(view).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it.each(["%", "%FF", "%E0%A4%A"])("handles malformed parameters %s and permits recovery", async (parameter) => {
    const view = vi.fn(() => "page");
    const load = vi.fn(async () => "data");
    const router = createRouter({
      initialUrl: `https://example.com/docs/${parameter}`,
      routes: [{ path: "/docs/:slug", view, load }],
    });
    expect(router.current.get().route).toBeUndefined();
    expect(() => router.navigate(`/docs/${parameter}`)).not.toThrow();
    await router.prefetch(`/docs/${parameter}`);
    expect(load).not.toHaveBeenCalled();
    router.navigate("/docs/%E6%97%A5%E6%9C%AC");
    expect(router.current.get().params["slug"]).toBe("日本");
    router.dispose();
  });

  it.each(["all", "target", "dispose"] as const)("cancels a waiting navigation on %s without restarting loaders", async (mode) => {
    let allowed = true;
    let finish!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    const router = createRouter({ window, routes: [
      { path: "/private", beforeEnter: () => allowed, load, view: () => "private" },
    ] });
    const prefetched = router.prefetch("/private");
    router.navigate("/private");
    expect(router.current.get().loading).toBe(true);
    allowed = false;
    if (mode === "dispose") router.dispose();
    else router.invalidatePrefetch(mode === "target" ? "/private" : undefined);
    if (mode !== "dispose") {
      // Cancellation settles even when the underlying loader ignores its signal.
      expect(router.current.get().loading).toBe(false);
      expect(router.current.get().matches).toEqual([]);
    }
    finish("secret");
    await prefetched;
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(router.current.get().data).not.toBe("secret");
    allowed = true;
    if (mode === "dispose") {
      router.navigate("/private");
      await router.prefetch("/private");
      router.reload();
      expect(load).toHaveBeenCalledTimes(1);
    } else {
      router.navigate("/private");
      expect(load).toHaveBeenCalledTimes(2);
    }
    router.dispose();
  });

  it.each([false, true])("rechecks admission when a pending prefetch settles (reject=%s)", async (reject) => {
    let allowed = true;
    let finish!: () => void;
    const load = vi.fn(() => new Promise<string>((resolve, fail) => {
      finish = () => reject ? fail(new Error("prefetch failed")) : resolve("secret");
    }));
    const guard = vi.fn(() => allowed);
    const router = createRouter({ window, routes: [
      { path: "/private", beforeEnter: guard, load, view: () => "private" },
    ] });
    const prefetched = router.prefetch("/private").catch(() => undefined);
    router.navigate("/private");
    allowed = false;
    finish();
    await prefetched;
    await Promise.resolve();
    expect(guard).toHaveBeenCalledTimes(3);
    expect(load).toHaveBeenCalledTimes(1);
    expect(router.current.get().matches).toEqual([]);
    expect(router.current.get().loading).toBe(false);
    router.dispose();
  });

  it("does not let an old prefetch completion remove a replacement for the same URL", async () => {
    const finish: Array<(value: string) => void> = [];
    const load = vi.fn(() => new Promise<string>((resolve) => { finish.push(resolve); }));
    const router = createRouter({ window, routes: [{ path: "/private", load, view: () => "private" }] });
    const first = router.prefetch("/private");
    router.navigate("/private");
    router.invalidatePrefetch("/private");
    const second = router.prefetch("/private");
    finish[0]!("stale");
    await first;
    router.navigate("/private");
    expect(load).toHaveBeenCalledTimes(2);
    finish[1]!("fresh");
    await second;
    await Promise.resolve();
    expect(router.current.get().data).toBe("fresh");
    router.dispose();
  });

  it("preserves a newer navigation started by an abort handler", () => {
    let winnerSignal!: AbortSignal;
    const loserLoad = vi.fn(async () => "loser");
    const winnerLoad = vi.fn((_match: unknown, signal: AbortSignal) => {
      winnerSignal = signal;
      return new Promise<string>(() => {});
    });
    const router = createRouter({ window, routes: [
      { path: "/first", view: () => "first", load: (_match, signal) => {
        signal.addEventListener("abort", () => router.navigate("/winner"), { once: true });
        return new Promise<string>(() => {});
      } },
      { path: "/loser", load: loserLoad, view: () => "loser" },
      { path: "/winner", load: winnerLoad, view: () => "winner" },
    ] });
    router.navigate("/first");
    router.navigate("/loser");
    expect(router.current.get().path).toBe("/winner");
    expect(window.location.pathname).toBe("/winner");
    expect(loserLoad).not.toHaveBeenCalled();
    expect(winnerLoad).toHaveBeenCalledTimes(1);
    expect(winnerSignal.aborted).toBe(false);
    router.dispose();
    expect(winnerSignal.aborted).toBe(true);
  });

  it("does not start stale loaders after a subscriber navigates", () => {
    const staleLoad = vi.fn(async () => "stale");
    const router = createRouter({ window, routes: [
      { path: "/stale", load: staleLoad, view: () => "stale" },
      { path: "/winner", view: () => "winner" },
    ] });
    const off = router.current.on(() => {
      if (router.current.get().path === "/stale") router.navigate("/winner");
    });
    router.navigate("/stale");
    expect(router.current.get().path).toBe("/winner");
    expect(staleLoad).not.toHaveBeenCalled();
    off();
    router.dispose();
  });

  it("does not start prefetch loaders after a guard disposes the router", async () => {
    const load = vi.fn(async () => "secret");
    const router = createRouter({ window, routes: [{
      path: "/private", view: () => "private", load,
      beforeEnter: () => { router.dispose(); return true; },
    }] });
    await router.prefetch("/private");
    expect(load).not.toHaveBeenCalled();
  });

  it.each(["dispose", "invalidate"])("registers prefetch cancellation before loaders can %s", async (mode) => {
    let parentSignal!: AbortSignal;
    const childLoad = vi.fn(async () => "child");
    const router = createRouter({ window, routes: [{
      path: "/private", view: () => "parent",
      load: async (_match, signal) => {
        parentSignal = signal;
        if (mode === "dispose") router.dispose();
        else router.invalidatePrefetch("/private/page");
        return "parent";
      },
      children: [{ path: "page", view: () => "child", load: childLoad }],
    }] });
    await router.prefetch("/private/page");
    expect(parentSignal.aborted).toBe(true);
    expect(childLoad).not.toHaveBeenCalled();
    router.dispose();
  });

  it.each(["throw", "redirect-loop"])("settles and reports %s during resumed admission", async (mode) => {
    let failAdmission = false;
    let finish!: (value: string) => void;
    const onError = vi.fn();
    const load = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    const router = createRouter({ window, onError, routes: [{
      path: "/private", view: () => "private", load,
      beforeEnter: () => {
        if (!failAdmission) return true;
        if (mode === "throw") throw new Error("guard unavailable");
        return "/private";
      },
    }] });
    const prefetched = router.prefetch("/private");
    router.navigate("/private");
    failAdmission = true;
    finish("secret");
    await prefetched;
    await Promise.resolve();
    expect(router.current.get().matches).toEqual([]);
    expect(router.current.get().loading).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ phase: "guard", error: expect.any(Error) }));
    router.dispose();
  });

  it.each(["navigate", "dispose"])("preserves recovery when onError calls %s", async (mode) => {
    let reject!: (reason: Error) => void;
    let allowed = true;
    const router = createRouter({ window, routes: [
      { path: "/login", view: () => "login" },
      { path: "/private", view: () => "private", beforeEnter: () => allowed,
        load: async () => "parent secret", children: [{
          path: "page", view: () => "page",
          load: () => new Promise<string>((_resolve, fail) => { reject = fail; }),
        }] },
    ], onError: () => {
      allowed = false;
      if (mode === "navigate") router.navigate("/login");
      else router.dispose();
    } });
    router.navigate("/private/page");
    await Promise.resolve();
    const beforeFailure = router.current.get();
    reject(new Error("denied"));
    await Promise.resolve();
    await Promise.resolve();
    if (mode === "navigate") {
      expect(router.current.get().path).toBe("/login");
      expect(router.current.get().data).toBeUndefined();
    } else expect(router.current.get()).toBe(beforeFailure);
    router.dispose();
  });
});

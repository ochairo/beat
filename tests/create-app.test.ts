import { pulse } from "@ochairo/pulse";
import { describe, expect, it, vi } from "vitest";
import { createApp, type BeatMountContext } from "../src/index.js";

describe("createApp", () => {
  it("mounts with pulse state and runs cleanup on destroy", () => {
    const state = pulse({ count: 1 });
    const target = document.createElement("div");
    const cleanup = vi.fn();
    const mount = vi.fn<
      (context: BeatMountContext<{ count: number }>) => (() => void) | void
    >(() => cleanup);

    const app = createApp({ state, mount });

    app.mount(target);

    expect(app.mounted).toBe(true);
    expect(mount).toHaveBeenCalledTimes(1);
    const firstCall = mount.mock.calls[0]?.[0];

    expect(firstCall?.state).toBe(state);
    expect(firstCall?.target).toBe(target);

    app.destroy();

    expect(app.mounted).toBe(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("disposes the previous mount before remounting to a new target", () => {
    const state = pulse({ count: 1 });
    const firstTarget = document.createElement("div");
    const secondTarget = document.createElement("div");
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const mount = vi
      .fn<
        (context: BeatMountContext<{ count: number }>) => (() => void) | void
      >()
      .mockReturnValueOnce(firstCleanup)
      .mockReturnValueOnce(secondCleanup);

    const app = createApp({ state, mount });

    app.mount(firstTarget);
    app.mount(secondTarget);

    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).not.toHaveBeenCalled();
  });
});

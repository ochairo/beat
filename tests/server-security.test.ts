import { describe, expect, it, vi } from "vitest";
import { component, onCleanup, onMount, render } from "../src/index.js";
import { jsx } from "../src/jsx-runtime.js";
import { renderToString } from "../src/server.js";

describe("SSR text serialization boundary", () => {
  it.each(["script", "style", "xmp", "iframe", "noembed", "noframes", "noscript"])("rejects raw-text breakout in %s", (tag) => {
    const data = `</${tag}><img src=x onerror=alert(1)>`;
    expect(() => renderToString(() => jsx(tag, { children: data }))).toThrow(TypeError);
  });

  it.each(["</ScRiPt\t>", "</script/>", "<!--<script>"])("rejects script parser state transitions: %s", (data) => {
    expect(() => renderToString(() => jsx("script", { type: "application/json", children: JSON.stringify({ data }) }))).toThrow(TypeError);
  });

  it("checks text spanning adjacent nodes", () => {
    expect(() => renderToString(() => {
      const script = document.createElement("script");
      script.append(document.createTextNode("</scr"), document.createTextNode("ipt><img src=x>"));
      return script;
    })).toThrow(TypeError);
  });

  it.each(["script", "style", "textarea", "title"])("rejects non-text children of %s", (tag) => {
    expect(() => renderToString(() => jsx(tag, { children: jsx("style", { children: "</textarea><img src=x>" }) }))).toThrow(TypeError);
  });

  it.each(["svg", "math", "select", "frameset"])("rejects raw text in unsupported %s context", (tag) => {
    expect(() => renderToString(() => jsx(tag, { children: jsx("style", { children: "body{color:red}" }) }))).toThrow(TypeError);
  });

  it("checks serialized template content", () => {
    expect(() => renderToString(() => {
      const template = document.createElement("template");
      const script = document.createElement("script");
      script.textContent = "</script><img src=x>";
      template.content.append(script);
      return template;
    })).toThrow(TypeError);
  });

  it("rejects plaintext serialization", () => {
    expect(() => renderToString(() => jsx("plaintext", { children: "text" }))).toThrow(TypeError);
  });

  it("preserves safe JS, CSS, and escaped JSON string data", () => {
    const js = 'const value = "ok & done";';
    const css = "body { color: red; }";
    const data = JSON.stringify({ value: "</script>" }).replace(/</g, "\\u003c");
    const html = renderToString(() => [
      jsx("script", { children: js }),
      jsx("style", { children: css }),
      jsx("script", { type: "application/json", children: data }),
    ]);
    expect(html).toContain(js);
    expect(html).toContain(css);
    expect(html).toContain(data);
  });

  it.each(["div", "textarea", "title"])("retains native text escaping in %s", (tag) => {
    const text = '<img src=x> & "日本"';
    const html = renderToString(() => jsx(tag, { children: text }));
    const target = document.createElement("div");
    target.innerHTML = html;
    expect(target.querySelector("img")).toBeNull();
    expect(target.textContent).toBe(text);
  });

  it.each([false, true])("cleans once and exits SSR after rejection (cleanup throws=%s)", async (throws) => {
    const cleanup = vi.fn(() => { if (throws) throw new Error("cleanup failed"); });
    const Unsafe = component(() => {
      onCleanup(cleanup);
      return jsx("script", { children: "</script>" });
    });
    expect(() => renderToString(() => Unsafe({}))).toThrow();
    expect(cleanup).toHaveBeenCalledTimes(1);
    const mounted = vi.fn();
    const Safe = component(() => {
      onMount(mounted);
      return jsx("p", { children: "safe" });
    });
    const dispose = render(document.createElement("div"), Safe({}));
    await Promise.resolve();
    expect(mounted).toHaveBeenCalledTimes(1);
    dispose();
  });
});

import { describe, expect, it } from "vitest";
import { transformBeatControlFlow } from "../src/vite-plugin.js";

describe("vite plugin transform", () => {
  it("leaves Beat control-flow components on the normal JSX runtime path", () => {
    const input = `
      const view = () => (
        <section>
          <Show when={visible} fallback="hidden">visible</Show>
          <For each={items}>{(item) => <span>{item.id.get()}</span>}</For>
          <Link to="/home">Home</Link>
          <Outlet router={router} />
        </section>
      );
    `;

    const output = transformBeatControlFlow(input, "/virtual/app.tsx");

    expect(output).toContain("<Show when={visible}");
    expect(output).toContain("<For each={items}");
    expect(output).toContain('<Link to="/home"');
    expect(output).toContain("<Outlet router={router}");
    expect(output).toContain("<span __beatText={item.id.get()}></span>");
  });

  it("lowers intrinsic text, class, style, and property bindings", () => {
    const input = `
      const view = () => (
        <button
          text={label}
          class:active={isActive}
          style:color={accent}
          prop:title={tooltip}
        />
      );
    `;

    const output = transformBeatControlFlow(input, "/virtual/app.tsx");

    expect(output).toContain("__beatText");
    expect(output).toContain("__beatClassBindings");
    expect(output).toContain("active: isActive");
    expect(output).toContain("__beatStyleBindings");
    expect(output).toContain("color: accent");
    expect(output).toContain("__beatPropertyBindings");
    expect(output).toContain("title: tooltip");
    expect(output).not.toContain("class:active");
    expect(output).not.toContain("style:color");
    expect(output).not.toContain("prop:title");
  });

  it("lowers single intrinsic child expressions into direct text bindings", () => {
    const input = `
      const view = () => <button>{label}</button>;
    `;

    const output = transformBeatControlFlow(input, "/virtual/app.tsx");

    expect(output).toContain("__beatText");
    expect(output).not.toContain("{label}</button>");
  });

  it("does not duplicate text lowering when explicit text binding already exists", () => {
    const input = `
      const view = () => <button text={label}>{other}</button>;
    `;

    const output = transformBeatControlFlow(input, "/virtual/app.tsx");

    expect(output).toContain("__beatText");
    expect(output?.match(/__beatText/g)?.length).toBe(1);
    expect(output).toContain("{other}");
  });

  it("does not lower multi-child intrinsic content into a single text binding", () => {
    const input = `
      const view = () => <button>{label}<span>suffix</span></button>;
    `;

    const output = transformBeatControlFlow(input, "/virtual/app.tsx");

    expect(output).toContain("<button>{label}<span");
    expect(output).not.toContain("<button __beatText");
    expect(output).toContain('<span __beatText={"suffix"}></span>');
  });

  it("preserves spread props while lowering explicit intrinsic bindings", () => {
    const input = `
      const view = () => <button {...rest} text={label} class:active={isActive} />;
    `;

    const output = transformBeatControlFlow(input, "/virtual/app.tsx");

    expect(output).toContain("...rest");
    expect(output).toContain("__beatText");
    expect(output).toContain("__beatClassBindings");
    expect(output).toContain("active: isActive");
  });
});

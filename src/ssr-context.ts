// Internal SSR context — not exported from any public entry point.
// JavaScript is single-threaded, so a module-level counter is safe
// for synchronous renderToString calls.
let ssrDepth = 0;

export function enterSsr(): void {
  ssrDepth += 1;
}

export function exitSsr(): void {
  ssrDepth -= 1;
}

export function isInSsr(): boolean {
  return ssrDepth > 0;
}

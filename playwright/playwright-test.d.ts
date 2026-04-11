declare module "@playwright/test" {
  export interface Locator {
    first(): Locator;
    hover(): Promise<void>;
    nth(index: number): Locator;
    filter(options: { hasText?: string }): Locator;
    locator(selector: string): Locator;
    click(): Promise<void>;
    textContent(): Promise<string | null>;
  }

  export interface Page {
    goto(url: string): Promise<void>;
    locator(selector: string): Locator;
    getByRole(role: string, options: { name: RegExp }): Locator;
  }

  export interface PollMatchers<TResult> {
    not: {
      toBe(expected: TResult): Promise<void>;
    };
  }

  export interface Matchers {
    toBeVisible(): Promise<void>;
    toHaveLength(length: number): void;
    toBe(expected: unknown): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
  }

  export interface Expect {
    (actual: unknown): Matchers;
    poll<TResult>(
      callback: () => Promise<TResult> | TResult,
    ): PollMatchers<TResult>;
  }

  export const expect: Expect;

  export const test: (
    name: string,
    callback: (args: { page: Page }) => Promise<void>,
  ) => void;

  export function defineConfig(config: unknown): unknown;

  export const chromium: {
    launch(options?: { headless?: boolean }): Promise<{
      newPage(): Promise<Page>;
      close(): Promise<void>;
    }>;
  };
}

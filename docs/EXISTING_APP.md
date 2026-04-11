# Beat Existing App Setup

Use this guide if you already have an app and want to add Beat manually instead of starting from `create-beat`.

## 1. Install Packages

```sh
pnpm add @ochairo/beat @ochairo/pulse
```

Beat currently expects:

- Node `>=24 <25`
- pnpm `>=10`

## 2. Configure Vite

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

## 3. Configure TypeScript

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

## 4. Create A Small Entry Point

```tsx
import { pulse } from "@ochairo/pulse";
import { For, createRoot } from "@ochairo/beat";

const count = pulse(0);
const items = pulse(["tea", "coffee"]);

const app = (
  <main>
    <h1>Beat</h1>
    <button onClick={() => count.set(count.get() + 1)}>
      count: {count}
    </button>
    <ul>
      <For each={items}>
        {(item) => <li>{item}</li>}
      </For>
    </ul>
  </main>
);

createRoot(document.getElementById("app")!).render(app);
```

## 5. Next Steps

- [Getting Started](./GETTING_STARTED.md)
- [API](./API.md)
- [Compiler Contract](./COMPILER.md)

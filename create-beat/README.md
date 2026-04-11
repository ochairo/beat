# @ochairo/create-beat

Scaffold a Beat app with:

- Vite
- TypeScript
- `@ochairo/beat`
- `@ochairo/pulse`
- a complete starter app shell
- starter styles and `.gitignore`

Usage:

```sh
pnpm create @ochairo/beat my-app
pnpm create @ochairo/beat my-app --template router
```

The generated app includes a small task workflow so the project starts with real state,
real actions, and a layout worth extending.

Templates:

- `starter`: task app with explicit Pulse state
- `router`: outlet shell with Beat router, links, route loader data, and a resource example

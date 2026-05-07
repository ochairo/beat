import { pulse, type Pulse } from "@ochairo/pulse";
import {
  jsx,
  toRendered,
  type BeatJsxChild,
  type BeatJsxProps,
} from "./jsx-runtime.js";

export interface BeatRouteDefinition {
  readonly path: string;
  readonly outlet?: string;
  readonly view: (match: BeatRouteMatch) => BeatJsxChild;
  readonly errorView?: (error: unknown, match: BeatRouteMatch) => BeatJsxChild;
  readonly children?: readonly BeatRouteDefinition[];
  readonly load?: (
    match: BeatRouteMatch,
    signal: AbortSignal,
  ) => Promise<unknown>;
  readonly redirectTo?:
    | BeatNavigationTarget
    | ((match: BeatRouteMatch) => BeatNavigationTarget);
  readonly beforeEnter?: (
    context: BeatRouteGuardContext,
  ) => BeatRouteGuardResult;
}

export interface BeatRedirect {
  readonly to: string;
  readonly replace?: boolean;
}

export type BeatNavigationTarget = string | BeatRedirect;

export type BeatRouteGuardResult = void | boolean | BeatNavigationTarget;

export interface BeatRouteMatch {
  readonly path: string;
  readonly fullPath: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly route?: BeatRouteDefinition;
  readonly matches: readonly BeatRouteBranchMatch[];
  readonly routeData: readonly BeatRouteDataMatch[];
  readonly depth: number;
  readonly status: BeatRouteDataStatus;
  readonly loading: boolean;
  readonly data: unknown;
  readonly error: unknown;
  outlet(name?: string): BeatJsxChild | null;
  navigate(to: string, options?: BeatNavigateOptions): void;
  back(): void;
}

export interface BeatRouteBranchMatch {
  readonly route: BeatRouteDefinition;
  readonly depth: number;
}

export type BeatRouteDataStatus = "idle" | "pending" | "resolved" | "rejected";

export interface BeatRouteDataMatch extends BeatRouteBranchMatch {
  readonly status: BeatRouteDataStatus;
  readonly loading: boolean;
  readonly data: unknown;
  readonly error: unknown;
}

export interface CreateBeatRouterOptions {
  readonly routes: readonly BeatRouteDefinition[];
  readonly basePath?: string;
  readonly prefetchCacheMaxEntries?: number;
  readonly window?: Window;
  /**
   * Initial URL for server-side rendering. When provided, the router resolves
   * the matching route from this URL instead of reading `window.location`.
   * All navigation and history operations become no-ops.
   *
   * @example
   * ```ts
   * const router = createRouter({ routes, initialUrl: "https://example.com/blog/post-1" });
   * ```
   */
  readonly initialUrl?: string;
  readonly onError?: (event: BeatRouteErrorEvent) => void;
}

export interface BeatNavigateOptions {
  readonly replace?: boolean;
}

export interface BeatRouteGuardContext {
  readonly from: BeatRouteMatch;
  readonly to: BeatRouteMatch;
  readonly router: BeatRouter;
}

export type BeatRouteErrorPhase = "load" | "render";

export interface BeatRouteErrorEvent {
  readonly phase: BeatRouteErrorPhase;
  readonly error: unknown;
  readonly route?: BeatRouteDefinition;
  readonly match: BeatRouteMatch;
  readonly outlet?: string;
}

export interface BeatRouter {
  readonly current: Pulse<BeatRouteMatch>;
  readonly onError?: (event: BeatRouteErrorEvent) => void;
  resolve(to: string): URL;
  navigate(to: string, options?: BeatNavigateOptions): void;
  prefetch(to: string): Promise<void>;
  invalidatePrefetch(to?: string): void;
  reload(): void;
  back(): void;
  dispose(): void;
}

export interface LinkProps extends BeatJsxProps {
  readonly router: BeatRouter;
  readonly to: string;
  readonly replace?: boolean;
  readonly prefetch?: boolean | "hover" | "focus";
}

export interface OutletProps {
  readonly router: BeatRouter;
  readonly name?: string;
}

interface CompiledRoute {
  readonly definitions: readonly BeatRouteDefinition[];
  readonly segments: readonly string[];
  readonly outlets: readonly string[];
  readonly namedOutletCount: number;
}

interface BeatResolvedNavigation {
  readonly url: URL;
  readonly match: InternalBeatRouteMatch;
  readonly replace: boolean;
}

interface InternalBeatRouteDataState {
  readonly status: BeatRouteDataStatus;
  readonly loading: boolean;
  readonly data: unknown;
  readonly error: unknown;
}

interface InternalBeatNamedOutletMatch {
  readonly parentDepth: number;
  readonly name: string;
  readonly matches: readonly BeatRouteBranchMatch[];
  readonly routeData: readonly BeatRouteDataMatch[];
}

interface InternalBeatRouteMatch extends BeatRouteMatch {
  readonly namedOutlets: readonly InternalBeatNamedOutletMatch[];
}

type InternalBeatBranchLocator =
  | { readonly kind: "main" }
  | {
      readonly kind: "named";
      readonly parentDepth: number;
      readonly name: string;
    };

interface InternalBeatBranchSource {
  readonly matches: readonly BeatRouteBranchMatch[];
  readonly routeData: readonly BeatRouteDataMatch[];
  readonly locator: InternalBeatBranchLocator;
}

interface InternalBeatPrefetchedState {
  readonly routeDataStates: readonly InternalBeatRouteDataState[];
  readonly namedOutletRouteDataStates: readonly (readonly InternalBeatRouteDataState[])[];
}

interface InternalBeatLoadTarget {
  readonly branch: InternalBeatBranchSource;
  readonly depthIndex: number;
  readonly route: BeatRouteDefinition;
  readonly namedIndex?: number;
  readonly outlet?: string;
}

const MAX_REDIRECT_DEPTH = 10;
const DEFAULT_PREFETCH_CACHE_MAX_ENTRIES = 20;
const IDLE_ROUTE_DATA_STATE: InternalBeatRouteDataState = {
  status: "idle",
  loading: false,
  data: undefined,
  error: undefined,
};

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function splitPathname(pathname: string): readonly string[] {
  const trimmed = trimSlashes(pathname);
  return trimmed === "" ? [] : trimmed.split("/");
}

function getOutletName(route: BeatRouteDefinition): string {
  return route.outlet ?? "default";
}

function normalizeQuery(
  searchParams: URLSearchParams,
): Readonly<Record<string, string>> {
  const query: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

function createBranchMatches(
  definitions: readonly BeatRouteDefinition[],
  startDepth = 0,
): readonly BeatRouteBranchMatch[] {
  return definitions.map((definition, index) => ({
    route: definition,
    depth: startDepth + index,
  }));
}

function compileRoutes(
  routes: readonly BeatRouteDefinition[],
): readonly CompiledRoute[] {
  const compiled: CompiledRoute[] = [];

  const visit = (
    currentRoutes: readonly BeatRouteDefinition[],
    parentDefinitions: readonly BeatRouteDefinition[],
    parentSegments: readonly string[],
  ): void => {
    for (const definition of currentRoutes) {
      const nextDefinitions = [...parentDefinitions, definition];
      const nextSegments = [
        ...parentSegments,
        ...splitPathname(definition.path),
      ];
      const nextOutlets = nextDefinitions.map((route) => getOutletName(route));

      compiled.push({
        definitions: nextDefinitions,
        segments: nextSegments,
        outlets: nextOutlets,
        namedOutletCount: nextOutlets.filter((name) => name !== "default")
          .length,
      });

      if (definition.children && definition.children.length > 0) {
        visit(definition.children, nextDefinitions, nextSegments);
      }
    }
  };

  visit(routes, [], []);

  return compiled.sort((left, right) => {
    if (right.segments.length !== left.segments.length) {
      return right.segments.length - left.segments.length;
    }

    if (left.namedOutletCount !== right.namedOutletCount) {
      return left.namedOutletCount - right.namedOutletCount;
    }

    return right.definitions.length - left.definitions.length;
  });
}

function getMatchingRoutes(
  pathnameSegments: readonly string[],
  routes: readonly CompiledRoute[],
): readonly CompiledRoute[] {
  const matches: CompiledRoute[] = [];

  for (const route of routes) {
    if (route.segments.length !== pathnameSegments.length) {
      continue;
    }

    let matched = true;

    for (const [index, segment] of route.segments.entries()) {
      const current = pathnameSegments[index];

      if (segment.startsWith(":")) {
        if (current === undefined) {
          matched = false;
          break;
        }

        continue;
      }

      if (segment !== current) {
        matched = false;
        break;
      }
    }

    if (matched) {
      matches.push(route);
    }
  }

  return matches;
}

function buildParams(
  pathnameSegments: readonly string[],
  route: CompiledRoute,
): Readonly<Record<string, string>> {
  const params: Record<string, string> = {};

  for (const [index, segment] of route.segments.entries()) {
    if (!segment.startsWith(":")) {
      continue;
    }

    const current = pathnameSegments[index];
    if (current !== undefined) {
      params[segment.slice(1)] = decodeURIComponent(current);
    }
  }

  return params;
}

function createNamedOutletMatches(
  primary: CompiledRoute,
  matchedRoutes: readonly CompiledRoute[],
): readonly InternalBeatNamedOutletMatch[] {
  const namedOutlets: InternalBeatNamedOutletMatch[] = [];
  const seen = new Set<string>();

  for (const route of matchedRoutes) {
    if (route === primary) {
      continue;
    }

    let divergenceDepth = -1;

    for (let index = 0; index < route.definitions.length; index += 1) {
      if (
        route.definitions[index] !== primary.definitions[index] ||
        route.outlets[index] !== primary.outlets[index]
      ) {
        divergenceDepth = index;
        break;
      }
    }

    if (divergenceDepth === -1) {
      continue;
    }

    const name = route.outlets[divergenceDepth];
    if (!name || name === "default") {
      continue;
    }

    const parentDepth = divergenceDepth - 1;
    const key = `${parentDepth}:${name}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    const matches = createBranchMatches(
      route.definitions.slice(divergenceDepth),
      divergenceDepth,
    );

    namedOutlets.push({
      parentDepth,
      name,
      matches,
      routeData: matches.map((match) => ({
        ...match,
        ...IDLE_ROUTE_DATA_STATE,
      })),
    });
  }

  return namedOutlets;
}

function matchRoute(
  url: URL,
  routes: readonly CompiledRoute[],
  basePath: string,
): InternalBeatRouteMatch {
  const normalizedBase = trimSlashes(basePath);
  const basePrefix = normalizedBase === "" ? "" : `/${normalizedBase}`;
  const pathname =
    basePrefix !== "" && url.pathname.startsWith(basePrefix)
      ? url.pathname.slice(basePrefix.length) || "/"
      : url.pathname;
  const pathnameSegments = splitPathname(pathname);
  const matchedRoutes = getMatchingRoutes(pathnameSegments, routes);
  const primaryRoute =
    matchedRoutes.find((route) => route.namedOutletCount === 0) ??
    matchedRoutes[0];

  if (primaryRoute) {
    const params = buildParams(pathnameSegments, primaryRoute);
    const matches = createBranchMatches(primaryRoute.definitions);
    const leafRoute =
      primaryRoute.definitions[primaryRoute.definitions.length - 1];

    if (leafRoute) {
      return {
        path: pathname || "/",
        fullPath: `${pathname || "/"}${url.search}`,
        params,
        query: normalizeQuery(url.searchParams),
        route: leafRoute,
        matches,
        routeData: matches.map((match) => ({
          ...match,
          ...IDLE_ROUTE_DATA_STATE,
        })),
        namedOutlets: createNamedOutletMatches(primaryRoute, matchedRoutes),
        depth: matches.length - 1,
        status: IDLE_ROUTE_DATA_STATE.status,
        loading: IDLE_ROUTE_DATA_STATE.loading,
        data: IDLE_ROUTE_DATA_STATE.data,
        error: IDLE_ROUTE_DATA_STATE.error,
        outlet() {
          return null;
        },
        navigate() {},
        back() {},
      };
    }
  }

  return {
    path: pathname || "/",
    fullPath: `${pathname || "/"}${url.search}`,
    params: {},
    query: normalizeQuery(url.searchParams),
    matches: [],
    routeData: [],
    namedOutlets: [],
    depth: -1,
    status: IDLE_ROUTE_DATA_STATE.status,
    loading: IDLE_ROUTE_DATA_STATE.loading,
    data: IDLE_ROUTE_DATA_STATE.data,
    error: IDLE_ROUTE_DATA_STATE.error,
    outlet() {
      return null;
    },
    navigate() {},
    back() {},
  };
}

function getLeafRouteDataState(
  states: readonly InternalBeatRouteDataState[],
  depth: number,
): InternalBeatRouteDataState {
  return states[depth] ?? IDLE_ROUTE_DATA_STATE;
}

function createRouteDataMatches(
  matches: readonly BeatRouteBranchMatch[],
  states: readonly InternalBeatRouteDataState[],
): readonly BeatRouteDataMatch[] {
  return matches.map((match, index) => ({
    ...match,
    ...(states[index] ?? IDLE_ROUTE_DATA_STATE),
  }));
}

function snapshotRouteDataStates(
  routeData: readonly BeatRouteDataMatch[],
): InternalBeatRouteDataState[] {
  return routeData.map((entry) => ({
    status: entry.status,
    loading: entry.loading,
    data: entry.data,
    error: entry.error,
  }));
}

function snapshotNamedRouteDataStates(
  match: InternalBeatRouteMatch,
): InternalBeatRouteDataState[][] {
  return match.namedOutlets.map((namedOutlet) =>
    snapshotRouteDataStates(namedOutlet.routeData),
  );
}

function cloneRouteDataState(
  state: InternalBeatRouteDataState,
): InternalBeatRouteDataState {
  return {
    status: state.status,
    loading: state.loading,
    data: state.data,
    error: state.error,
  };
}

function cloneRouteDataStates(
  states: readonly InternalBeatRouteDataState[],
): InternalBeatRouteDataState[] {
  return states.map((state) => cloneRouteDataState(state));
}

function cloneNamedRouteDataStates(
  states: readonly (readonly InternalBeatRouteDataState[])[],
): InternalBeatRouteDataState[][] {
  return states.map((namedStates) => cloneRouteDataStates(namedStates));
}

function decorateRouteMatch(
  match: InternalBeatRouteMatch,
  routeDataStates: readonly InternalBeatRouteDataState[],
  namedOutletRouteDataStates: readonly (readonly InternalBeatRouteDataState[])[],
): InternalBeatRouteMatch {
  const leafRouteDataState = getLeafRouteDataState(
    routeDataStates,
    match.depth,
  );

  return {
    path: match.path,
    fullPath: match.fullPath,
    params: match.params,
    query: match.query,
    ...(match.route ? { route: match.route } : {}),
    matches: match.matches,
    routeData: createRouteDataMatches(match.matches, routeDataStates),
    namedOutlets: match.namedOutlets.map((namedOutlet, index) => ({
      parentDepth: namedOutlet.parentDepth,
      name: namedOutlet.name,
      matches: namedOutlet.matches,
      routeData: createRouteDataMatches(
        namedOutlet.matches,
        namedOutletRouteDataStates[index] ?? [],
      ),
    })),
    depth: match.depth,
    status: leafRouteDataState.status,
    loading: leafRouteDataState.loading,
    data: leafRouteDataState.data,
    error: leafRouteDataState.error,
    outlet() {
      return null;
    },
    navigate() {},
    back() {},
  };
}

function createPendingRouteDataStates(
  matches: readonly BeatRouteBranchMatch[],
): readonly InternalBeatRouteDataState[] {
  return matches.map((match) =>
    match.route.load
      ? {
          status: "pending" as const,
          loading: true,
          data: undefined,
          error: undefined,
        }
      : IDLE_ROUTE_DATA_STATE,
  );
}

function createPendingNamedRouteDataStates(
  match: InternalBeatRouteMatch,
): readonly (readonly InternalBeatRouteDataState[])[] {
  return match.namedOutlets.map((namedOutlet) =>
    createPendingRouteDataStates(namedOutlet.matches),
  );
}

function collectLoadTargets(
  match: InternalBeatRouteMatch,
): readonly InternalBeatLoadTarget[] {
  const targets: InternalBeatLoadTarget[] = [];
  const mainBranch = getMainBranch(match);

  for (const [depthIndex, branchMatch] of match.matches.entries()) {
    if (!branchMatch.route.load) {
      continue;
    }

    targets.push({
      branch: mainBranch,
      depthIndex,
      route: branchMatch.route,
    });
  }

  for (const [namedIndex, namedOutlet] of match.namedOutlets.entries()) {
    const branch = getNamedOutletBranch(
      match,
      namedOutlet.parentDepth,
      namedOutlet.name,
    );

    if (!branch) {
      continue;
    }

    for (const [depthIndex, branchMatch] of namedOutlet.matches.entries()) {
      if (!branchMatch.route.load) {
        continue;
      }

      targets.push({
        branch,
        depthIndex,
        route: branchMatch.route,
        namedIndex,
        outlet: namedOutlet.name,
      });
    }
  }

  return targets;
}

function applyLoadTargetState(
  routeDataStates: InternalBeatRouteDataState[],
  namedOutletRouteDataStates: InternalBeatRouteDataState[][],
  target: InternalBeatLoadTarget,
  nextState: InternalBeatRouteDataState,
): void {
  if (target.namedIndex === undefined) {
    routeDataStates[target.depthIndex] = nextState;
    return;
  }

  const namedStates = namedOutletRouteDataStates[target.namedIndex];
  if (!namedStates) {
    return;
  }

  namedStates[target.depthIndex] = nextState;
}

function isPrefetchedStateCompatible(
  match: InternalBeatRouteMatch,
  prefetched: InternalBeatPrefetchedState,
): boolean {
  if (prefetched.routeDataStates.length !== match.matches.length) {
    return false;
  }

  if (
    prefetched.namedOutletRouteDataStates.length !== match.namedOutlets.length
  ) {
    return false;
  }

  return match.namedOutlets.every((namedOutlet, index) => {
    return (
      prefetched.namedOutletRouteDataStates[index]?.length ===
      namedOutlet.matches.length
    );
  });
}

function clearBetween(start: Comment, end: Comment): void {
  let current = start.nextSibling;

  while (current && current !== end) {
    const nextSibling = current.nextSibling;
    current.remove();
    current = nextSibling;
  }
}

function getMainBranch(
  match: InternalBeatRouteMatch,
): InternalBeatBranchSource {
  return {
    matches: match.matches,
    routeData: match.routeData,
    locator: {
      kind: "main",
    },
  };
}

function getNamedOutletBranch(
  match: InternalBeatRouteMatch,
  parentDepth: number,
  name: string,
): InternalBeatBranchSource | undefined {
  const namedOutlet = match.namedOutlets.find(
    (entry) => entry.parentDepth === parentDepth && entry.name === name,
  );

  if (!namedOutlet) {
    return undefined;
  }

  return {
    matches: namedOutlet.matches,
    routeData: namedOutlet.routeData,
    locator: {
      kind: "named",
      parentDepth,
      name,
    },
  };
}

function getBranchFromLocator(
  match: InternalBeatRouteMatch,
  locator: InternalBeatBranchLocator,
): InternalBeatBranchSource | undefined {
  if (locator.kind === "main") {
    return getMainBranch(match);
  }

  return getNamedOutletBranch(match, locator.parentDepth, locator.name);
}

function renderBranchOutlet(
  router: BeatRouter,
  locator: InternalBeatBranchLocator,
  depthIndex: number,
): BeatJsxChild {
  const fragment = document.createDocumentFragment();
  const start = document.createComment("beat-outlet-start");
  const end = document.createComment("beat-outlet-end");
  let cleanupCurrent = (): void => {};

  const renderCurrent = (match: InternalBeatRouteMatch): void => {
    cleanupCurrent();
    cleanupCurrent = (): void => {};
    clearBetween(start, end);

    const branch = getBranchFromLocator(match, locator);
    const currentRoute = branch?.matches[depthIndex]?.route;
    if (!branch || !currentRoute) {
      return;
    }

    const scopedMatch = createScopedMatch(router, match, branch, depthIndex);

    let rendered;

    try {
      const nextChild =
        scopedMatch.error !== undefined && currentRoute.errorView
          ? currentRoute.errorView(scopedMatch.error, scopedMatch)
          : currentRoute.view(scopedMatch);
      rendered = toRendered(nextChild);
    } catch (error) {
      router.onError?.({
        phase: "render",
        error,
        route: currentRoute,
        match: scopedMatch,
        ...(locator.kind === "named" ? { outlet: locator.name } : {}),
      });

      if (!currentRoute.errorView || scopedMatch.error !== undefined) {
        throw error;
      }

      rendered = toRendered(currentRoute.errorView(error, scopedMatch));
    }

    end.parentNode?.insertBefore(rendered.node, end);
    cleanupCurrent = rendered.cleanup ?? (() => {});
  };

  fragment.append(start, end);
  renderCurrent(router.current.get() as InternalBeatRouteMatch);

  const unsubscribe = router.current.on((event) => {
    renderCurrent(event.currentValue as InternalBeatRouteMatch);
  });

  return {
    node: fragment,
    cleanup: () => {
      unsubscribe();
      cleanupCurrent();
      clearBetween(start, end);
      start.remove();
      end.remove();
    },
  };
}

function createScopedMatch(
  router: BeatRouter,
  match: InternalBeatRouteMatch,
  branch: InternalBeatBranchSource,
  depthIndex: number,
): BeatRouteMatch {
  const currentMatch = branch.matches[depthIndex];
  const currentRoute = currentMatch?.route;
  const currentRouteData =
    branch.routeData[depthIndex] ?? IDLE_ROUTE_DATA_STATE;
  const currentDepth = currentMatch?.depth ?? -1;

  return {
    path: match.path,
    fullPath: match.fullPath,
    params: match.params,
    query: match.query,
    matches: branch.matches,
    routeData: branch.routeData,
    depth: currentDepth,
    status: currentRouteData.status,
    loading: currentRouteData.loading,
    data: currentRouteData.data,
    error: currentRouteData.error,
    ...(currentRoute ? { route: currentRoute } : {}),
    outlet(name?: string) {
      if (name !== undefined) {
        return renderNamedOutlet(router, currentDepth, name);
      }

      return renderBranchOutlet(router, branch.locator, depthIndex + 1);
    },
    navigate(to: string, options?: BeatNavigateOptions) {
      router.navigate(to, options);
    },
    back() {
      router.back();
    },
  };
}

function renderNamedOutlet(
  router: BeatRouter,
  parentDepth: number,
  name: string,
): BeatJsxChild {
  return renderBranchOutlet(
    router,
    {
      kind: "named",
      parentDepth,
      name,
    },
    0,
  );
}

export function createRouter(options: CreateBeatRouterOptions): BeatRouter {
  // When `initialUrl` is supplied without a real window (SSR), use a no-op
  // stub so that all browser-specific APIs (history, popstate) are silent.
  const noOpWindow = options.initialUrl
    ? ({
        location: { href: options.initialUrl },
        history: {
          pushState() {},
          replaceState() {},
          back() {},
        },
        addEventListener() {},
        removeEventListener() {},
      } as unknown as Window)
    : undefined;
  const targetWindow = options.window ?? noOpWindow ?? window;
  const compiledRoutes = compileRoutes(options.routes);
  const basePath = options.basePath ?? "";
  const normalizedBase = trimSlashes(basePath);
  const basePrefix = normalizedBase === "" ? "" : `/${normalizedBase}`;

  const resolveUrl = (path: string): URL => {
    if (
      basePrefix !== "" &&
      path.startsWith("/") &&
      !path.startsWith(basePrefix + "/") &&
      path !== basePrefix
    ) {
      return new URL(basePrefix + path, targetWindow.location.href);
    }

    return new URL(path, targetWindow.location.href);
  };

  const current = pulse<InternalBeatRouteMatch>(
    matchRoute(new URL(targetWindow.location.href), compiledRoutes, basePath),
  );
  let router!: BeatRouter;
  let activeLoadToken = 0;
  let activeLoadControllers: AbortController[] = [];
  const prefetchCacheMaxEntries =
    options.prefetchCacheMaxEntries ?? DEFAULT_PREFETCH_CACHE_MAX_ENTRIES;
  const prefetchedRouteStates = new Map<string, InternalBeatPrefetchedState>();
  const activePrefetches = new Map<
    string,
    {
      promise: Promise<void>;
      controllers: AbortController[];
    }
  >();

  const abortActiveLoads = (): void => {
    activeLoadToken += 1;
    for (const controller of activeLoadControllers) {
      controller.abort();
    }
    activeLoadControllers = [];
  };

  const touchPrefetchedRouteState = (
    key: string,
    state: InternalBeatPrefetchedState,
  ): void => {
    prefetchedRouteStates.delete(key);
    prefetchedRouteStates.set(key, state);

    if (prefetchCacheMaxEntries <= 0) {
      prefetchedRouteStates.clear();
      return;
    }

    while (prefetchedRouteStates.size > prefetchCacheMaxEntries) {
      const oldestKey = prefetchedRouteStates.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }

      prefetchedRouteStates.delete(oldestKey);
    }
  };

  const getPrefetchedRouteState = (
    key: string,
  ): InternalBeatPrefetchedState | undefined => {
    const state = prefetchedRouteStates.get(key);
    if (!state) {
      return undefined;
    }

    touchPrefetchedRouteState(key, state);
    return state;
  };

  const abortActivePrefetch = (key: string): void => {
    const activePrefetch = activePrefetches.get(key);
    if (!activePrefetch) {
      return;
    }

    for (const controller of activePrefetch.controllers) {
      controller.abort();
    }

    activePrefetches.delete(key);
  };

  const abortAllActivePrefetches = (): void => {
    for (const key of activePrefetches.keys()) {
      abortActivePrefetch(key);
    }
  };

  const normalizeTarget = (target: BeatNavigationTarget): BeatRedirect => {
    if (typeof target === "string") {
      return {
        to: target,
      };
    }

    return target;
  };

  const resolveNavigation = (
    initialUrl: URL,
    from: BeatRouteMatch,
    forceReplace = false,
  ): BeatResolvedNavigation | undefined => {
    let nextUrl = initialUrl;
    let replace = forceReplace;

    for (let depth = 0; depth < MAX_REDIRECT_DEPTH; depth += 1) {
      const match = matchRoute(nextUrl, compiledRoutes, basePath);
      const route = match.route;

      if (route?.redirectTo) {
        const redirect = normalizeTarget(
          typeof route.redirectTo === "function"
            ? route.redirectTo(match)
            : route.redirectTo,
        );
        nextUrl = resolveUrl(redirect.to);
        replace = replace || redirect.replace !== false;
        continue;
      }

      if (route?.beforeEnter) {
        const guardResult = route.beforeEnter({
          from,
          to: match,
          router,
        });

        if (guardResult === false) {
          return undefined;
        }

        if (guardResult && guardResult !== true) {
          const redirect = normalizeTarget(guardResult);
          nextUrl = resolveUrl(redirect.to);
          replace = replace || redirect.replace !== false;
          continue;
        }
      }

      return {
        url: nextUrl,
        match,
        replace,
      };
    }

    throw new Error("Beat router exceeded redirect limit");
  };

  const applyResolvedNavigation = (
    resolved: BeatResolvedNavigation,
    writeHistory: boolean,
    usePrefetchedState = true,
  ): void => {
    if (writeHistory) {
      if (resolved.replace) {
        targetWindow.history.replaceState(null, "", resolved.url);
      } else {
        targetWindow.history.pushState(null, "", resolved.url);
      }
    } else if (resolved.url.href !== targetWindow.location.href) {
      targetWindow.history.replaceState(null, "", resolved.url);
    }

    const prefetchKey = resolved.match.fullPath;
    const activePrefetch = usePrefetchedState
      ? activePrefetches.get(prefetchKey)
      : undefined;

    if (activePrefetch) {
      const nextRouteDataStates = createPendingRouteDataStates(
        resolved.match.matches,
      );
      const nextNamedRouteDataStates = createPendingNamedRouteDataStates(
        resolved.match,
      );
      const decoratedMatch = decorateRouteMatch(
        resolved.match,
        nextRouteDataStates,
        nextNamedRouteDataStates,
      );
      current.set(decoratedMatch);
      abortActiveLoads();

      void activePrefetch.promise
        .then(() => {
          const currentMatch = current.get();
          if (currentMatch.fullPath !== resolved.match.fullPath) {
            return;
          }

          const prefetchedState = getPrefetchedRouteState(prefetchKey);
          if (
            prefetchedState &&
            isPrefetchedStateCompatible(resolved.match, prefetchedState)
          ) {
            current.set(
              decorateRouteMatch(
                resolved.match,
                cloneRouteDataStates(prefetchedState.routeDataStates),
                cloneNamedRouteDataStates(
                  prefetchedState.namedOutletRouteDataStates,
                ),
              ),
            );
            return;
          }

          applyResolvedNavigation(resolved, false, false);
        })
        .catch(() => {
          const currentMatch = current.get();
          if (currentMatch.fullPath !== resolved.match.fullPath) {
            return;
          }

          applyResolvedNavigation(resolved, false, false);
        });
      return;
    }

    const prefetchedState = usePrefetchedState
      ? getPrefetchedRouteState(resolved.match.fullPath)
      : undefined;

    if (
      prefetchedState &&
      isPrefetchedStateCompatible(resolved.match, prefetchedState)
    ) {
      const decoratedPrefetchedMatch = decorateRouteMatch(
        resolved.match,
        cloneRouteDataStates(prefetchedState.routeDataStates),
        cloneNamedRouteDataStates(prefetchedState.namedOutletRouteDataStates),
      );
      current.set(decoratedPrefetchedMatch);
      abortActiveLoads();
      return;
    }

    const nextRouteDataStates = createPendingRouteDataStates(
      resolved.match.matches,
    );
    const nextNamedRouteDataStates = createPendingNamedRouteDataStates(
      resolved.match,
    );
    const decoratedMatch = decorateRouteMatch(
      resolved.match,
      nextRouteDataStates,
      nextNamedRouteDataStates,
    );
    current.set(decoratedMatch);

    abortActiveLoads();
    const loadToken = activeLoadToken;

    for (const target of collectLoadTargets(decoratedMatch)) {
      const controller = new AbortController();
      activeLoadControllers.push(controller);
      void target.route.load!(
        createScopedMatch(
          router,
          decoratedMatch,
          target.branch,
          target.depthIndex,
        ),
        controller.signal,
      )
        .then((data) => {
          if (controller.signal.aborted || loadToken !== activeLoadToken) {
            return;
          }

          const currentMatch = current.get();
          if (currentMatch.fullPath !== decoratedMatch.fullPath) {
            return;
          }

          const nextStates = snapshotRouteDataStates(currentMatch.routeData);
          const nextNamedStates = snapshotNamedRouteDataStates(currentMatch);
          applyLoadTargetState(nextStates, nextNamedStates, target, {
            status: "resolved",
            loading: false,
            data,
            error: undefined,
          });
          current.set(
            decorateRouteMatch(currentMatch, nextStates, nextNamedStates),
          );
        })
        .catch((error) => {
          if (controller.signal.aborted || loadToken !== activeLoadToken) {
            return;
          }

          const currentMatch = current.get();
          if (currentMatch.fullPath !== decoratedMatch.fullPath) {
            return;
          }

          const nextStates = snapshotRouteDataStates(currentMatch.routeData);
          const nextNamedStates = snapshotNamedRouteDataStates(currentMatch);
          router.onError?.({
            phase: "load",
            error,
            route: target.route,
            match: createScopedMatch(
              router,
              currentMatch,
              target.branch,
              target.depthIndex,
            ),
            ...(target.outlet ? { outlet: target.outlet } : {}),
          });
          applyLoadTargetState(nextStates, nextNamedStates, target, {
            status: "rejected",
            loading: false,
            data: undefined,
            error,
          });
          current.set(
            decorateRouteMatch(currentMatch, nextStates, nextNamedStates),
          );
        });
    }
  };

  const prefetchResolvedNavigation = (
    resolved: BeatResolvedNavigation,
  ): Promise<void> => {
    const key = resolved.match.fullPath;
    const cachedState = getPrefetchedRouteState(key);
    if (
      cachedState &&
      isPrefetchedStateCompatible(resolved.match, cachedState)
    ) {
      return Promise.resolve();
    }

    const existing = activePrefetches.get(key);
    if (existing) {
      return existing.promise;
    }

    const routeDataStates = cloneRouteDataStates(
      createPendingRouteDataStates(resolved.match.matches),
    );
    const namedOutletRouteDataStates = cloneNamedRouteDataStates(
      createPendingNamedRouteDataStates(resolved.match),
    );
    const prefetchedMatch = decorateRouteMatch(
      resolved.match,
      routeDataStates,
      namedOutletRouteDataStates,
    );
    const controllers: AbortController[] = [];

    const promise = Promise.all(
      collectLoadTargets(prefetchedMatch).map(async (target) => {
        const controller = new AbortController();
        controllers.push(controller);

        try {
          const data = await target.route.load!(
            createScopedMatch(
              router,
              prefetchedMatch,
              target.branch,
              target.depthIndex,
            ),
            controller.signal,
          );

          if (controller.signal.aborted) {
            return;
          }

          applyLoadTargetState(
            routeDataStates,
            namedOutletRouteDataStates,
            target,
            {
              status: "resolved",
              loading: false,
              data,
              error: undefined,
            },
          );
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          router.onError?.({
            phase: "load",
            error,
            route: target.route,
            match: createScopedMatch(
              router,
              prefetchedMatch,
              target.branch,
              target.depthIndex,
            ),
            ...(target.outlet ? { outlet: target.outlet } : {}),
          });

          throw error;
        }
      }),
    )
      .then(() => {
        if (controllers.some((controller) => controller.signal.aborted)) {
          return;
        }

        touchPrefetchedRouteState(key, {
          routeDataStates: cloneRouteDataStates(routeDataStates),
          namedOutletRouteDataStates: cloneNamedRouteDataStates(
            namedOutletRouteDataStates,
          ),
        });
      })
      .finally(() => {
        activePrefetches.delete(key);
      });

    activePrefetches.set(key, {
      promise,
      controllers,
    });

    return promise;
  };

  const sync = (usePrefetchedState = true): void => {
    const from = current.get();
    const resolved = resolveNavigation(
      new URL(targetWindow.location.href),
      from,
      true,
    );

    if (!resolved) {
      targetWindow.history.replaceState(null, "", from.fullPath);
      current.set(from);
      return;
    }

    applyResolvedNavigation(resolved, false, usePrefetchedState);
  };

  const handlePopState = (): void => {
    sync();
  };

  targetWindow.addEventListener("popstate", handlePopState);

  router = {
    current,
    ...(options.onError ? { onError: options.onError } : {}),
    resolve(to: string): URL {
      return resolveUrl(to);
    },
    navigate(to: string, options?: BeatNavigateOptions): void {
      const resolved = resolveNavigation(
        resolveUrl(to),
        current.get(),
        options?.replace === true,
      );

      if (!resolved) {
        return;
      }

      applyResolvedNavigation(resolved, true);
    },
    prefetch(to: string): Promise<void> {
      const resolved = resolveNavigation(resolveUrl(to), current.get(), true);

      if (!resolved) {
        return Promise.resolve();
      }

      return prefetchResolvedNavigation(resolved);
    },
    invalidatePrefetch(to?: string): void {
      if (to === undefined) {
        abortAllActivePrefetches();
        prefetchedRouteStates.clear();
        return;
      }

      const resolved = resolveNavigation(resolveUrl(to), current.get(), true);

      if (!resolved) {
        return;
      }

      abortActivePrefetch(resolved.match.fullPath);
      prefetchedRouteStates.delete(resolved.match.fullPath);
    },
    reload(): void {
      sync(false);
    },
    back(): void {
      targetWindow.history.back();
    },
    dispose(): void {
      abortActiveLoads();
      abortAllActivePrefetches();
      prefetchedRouteStates.clear();
      targetWindow.removeEventListener("popstate", handlePopState);
    },
  };

  const initialResolved = resolveNavigation(
    new URL(targetWindow.location.href),
    current.get(),
    true,
  );

  if (initialResolved) {
    applyResolvedNavigation(initialResolved, false);
  }

  return router;
}

export function Outlet(props: OutletProps): BeatJsxChild {
  if (props.name !== undefined) {
    return renderNamedOutlet(props.router, -1, props.name);
  }

  return renderBranchOutlet(
    props.router,
    {
      kind: "main",
    },
    0,
  );
}

export function Link(props: LinkProps): BeatJsxChild {
  const { router, to, replace, prefetch, ...rest } = props;
  const userOnClick = props["onClick"];
  const userOnMouseEnter = props["onMouseEnter"];
  const userOnFocus = props["onFocus"];
  const href = router.resolve(to);
  const sameOrigin = href.origin === window.location.origin;
  const target = props["target"];
  const download = props["download"];
  const shouldInterceptNavigation =
    sameOrigin &&
    (target === undefined || target === "" || target === "_self") &&
    download === undefined;
  const shouldPrefetchOnHover = prefetch === true || prefetch === "hover";
  const shouldPrefetchOnFocus = prefetch === true || prefetch === "focus";

  return jsx("a", {
    ...rest,
    href: sameOrigin
      ? `${href.pathname}${href.search}${href.hash}`
      : href.toString(),
    onMouseEnter(event: MouseEvent) {
      if (typeof userOnMouseEnter === "function") {
        userOnMouseEnter(event);
      }

      if (
        event.defaultPrevented ||
        !shouldPrefetchOnHover ||
        !shouldInterceptNavigation
      ) {
        return;
      }

      void router.prefetch(to);
    },
    onFocus(event: FocusEvent) {
      if (typeof userOnFocus === "function") {
        userOnFocus(event);
      }

      if (
        event.defaultPrevented ||
        !shouldPrefetchOnFocus ||
        !shouldInterceptNavigation
      ) {
        return;
      }

      void router.prefetch(to);
    },
    onClick(event: MouseEvent) {
      if (typeof userOnClick === "function") {
        userOnClick(event);
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (!shouldInterceptNavigation) {
        return;
      }

      event.preventDefault();
      router.navigate(to, replace === undefined ? undefined : { replace });
    },
  });
}

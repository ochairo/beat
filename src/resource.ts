import { pulse, type Pulse } from "@ochairo/pulse";

export type BeatResourceStatus = "idle" | "pending" | "resolved" | "rejected";

export interface BeatResourceState<TValue> {
  readonly status: BeatResourceStatus;
  readonly loading: boolean;
  readonly data: TValue | undefined;
  readonly error: unknown;
}

export interface CreateBeatResourceOptions<TSource, TValue> {
  readonly source?: Pulse<TSource>;
  readonly initialValue?: TValue;
  readonly load: (source: TSource, signal: AbortSignal) => Promise<TValue>;
  readonly immediate?: boolean;
  readonly debounceMs?: number;
  readonly keepStaleWhileRefreshing?: boolean;
  readonly getCacheKey?: (source: TSource) => string;
  readonly cacheTimeMs?: number;
  readonly cache?: BeatResourceCache<TValue>;
}

export interface BeatResource<TValue> {
  readonly state: Pulse<BeatResourceState<TValue>>;
  invalidate(cacheKey?: string): void;
  reload(): Promise<void>;
  dispose(): void;
}

export interface BeatResourceCache<TValue> {
  get(cacheKey: string): TValue | undefined;
  set(cacheKey: string, value: TValue, cacheTimeMs?: number): void;
  delete(cacheKey: string): void;
  clear(): void;
  pruneExpired(): number;
  size(): number;
  namespace(namespace: string): BeatResourceCache<TValue>;
}

export interface CreateBeatResourceCacheOptions {
  readonly maxEntries?: number;
  readonly defaultCacheTimeMs?: number;
  readonly namespace?: string;
  readonly eviction?: BeatResourceCacheEviction;
}

export type BeatResourceCacheEviction = "lru" | "fifo";

export interface CreateBeatDebouncedResourceOptions<
  TSource,
  TValue,
> extends CreateBeatResourceOptions<TSource, TValue> {
  readonly debounceMs: number;
}

interface BeatResourceCacheEntry<TValue> {
  readonly data: TValue;
  readonly expiresAt: number | undefined;
}

interface CreateBeatResourceCacheStoreOptions extends CreateBeatResourceCacheOptions {
  readonly entries?: Map<string, BeatResourceCacheEntry<unknown>>;
}

function createScopedCacheKey(
  namespace: string | undefined,
  cacheKey: string,
): string {
  return namespace ? `${namespace}:${cacheKey}` : cacheKey;
}

export function createResourceCache<TValue>(
  options: CreateBeatResourceCacheOptions = {},
): BeatResourceCache<TValue> {
  return createResourceCacheStore<TValue>(options);
}

function createResourceCacheStore<TValue>(
  options: CreateBeatResourceCacheStoreOptions,
): BeatResourceCache<TValue> {
  const entries =
    options.entries ?? new Map<string, BeatResourceCacheEntry<unknown>>();
  const namespacePrefix = options.namespace;

  const touch = (
    cacheKey: string,
    entry: BeatResourceCacheEntry<TValue>,
  ): void => {
    entries.delete(cacheKey);
    entries.set(cacheKey, entry);
  };

  const isScopedKey = (key: string): boolean => {
    if (!namespacePrefix) {
      return true;
    }

    return key.startsWith(`${namespacePrefix}:`);
  };

  const pruneExpiredEntries = (): number => {
    let removed = 0;

    for (const [key, entry] of entries.entries()) {
      if (!isScopedKey(key)) {
        continue;
      }

      if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
        entries.delete(key);
        removed += 1;
      }
    }

    return removed;
  };

  return {
    get(cacheKey: string): TValue | undefined {
      const scopedCacheKey = createScopedCacheKey(namespacePrefix, cacheKey);
      const entry = entries.get(scopedCacheKey) as
        | BeatResourceCacheEntry<TValue>
        | undefined;

      if (!entry) {
        return undefined;
      }

      if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
        entries.delete(scopedCacheKey);
        return undefined;
      }

      if ((options.eviction ?? "lru") === "lru") {
        touch(scopedCacheKey, entry);
      }
      return entry.data;
    },
    set(cacheKey: string, value: TValue, cacheTimeMs?: number): void {
      const scopedCacheKey = createScopedCacheKey(namespacePrefix, cacheKey);
      const effectiveCacheTimeMs = cacheTimeMs ?? options.defaultCacheTimeMs;

      touch(scopedCacheKey, {
        data: value,
        expiresAt:
          effectiveCacheTimeMs === undefined
            ? undefined
            : Date.now() + effectiveCacheTimeMs,
      });

      if (
        options.maxEntries !== undefined &&
        options.maxEntries > 0 &&
        entries.size > options.maxEntries
      ) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey !== undefined) {
          entries.delete(oldestKey);
        }
      }
    },
    delete(cacheKey: string): void {
      entries.delete(createScopedCacheKey(namespacePrefix, cacheKey));
    },
    clear(): void {
      if (!namespacePrefix) {
        entries.clear();
        return;
      }

      for (const key of entries.keys()) {
        if (key.startsWith(`${namespacePrefix}:`)) {
          entries.delete(key);
        }
      }
    },
    pruneExpired(): number {
      return pruneExpiredEntries();
    },
    size(): number {
      pruneExpiredEntries();

      let count = 0;
      for (const key of entries.keys()) {
        if (isScopedKey(key)) {
          count += 1;
        }
      }

      return count;
    },
    namespace(namespace: string): BeatResourceCache<TValue> {
      return createResourceCacheStore<TValue>({
        ...options,
        entries,
        namespace: createScopedCacheKey(namespacePrefix, namespace),
      });
    },
  };
}

function createInitialState<TValue>(
  initialValue?: TValue,
): BeatResourceState<TValue> {
  if (initialValue !== undefined) {
    return {
      status: "resolved",
      loading: false,
      data: initialValue,
      error: undefined,
    };
  }

  return {
    status: "idle",
    loading: false,
    data: undefined,
    error: undefined,
  };
}

export function createResource<TSource, TValue>(
  options: CreateBeatResourceOptions<TSource, TValue>,
): BeatResource<TValue> {
  const state = pulse(createInitialState(options.initialValue));
  let disposed = false;
  let requestId = 0;
  let activeController: AbortController | undefined;
  let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
  let pendingDebouncePromise: Promise<void> | undefined;
  let resolvePendingDebouncePromise: (() => void) | undefined;
  const localCache = createResourceCache<TValue>();
  const cache = options.cache ?? localCache;

  const readSource = (): TSource => {
    return options.source ? options.source.get() : (undefined as TSource);
  };

  const getActiveCacheKey = (): string | undefined => {
    if (!options.getCacheKey || !options.source) {
      return undefined;
    }

    return options.getCacheKey(options.source.get());
  };

  const readCachedValue = (cacheKey: string): TValue | undefined => {
    return cache.get(cacheKey);
  };

  const settlePendingDebounce = (): void => {
    resolvePendingDebouncePromise?.();
    pendingDebouncePromise = undefined;
    resolvePendingDebouncePromise = undefined;
  };

  const run = async (): Promise<void> => {
    const source = readSource();
    const cacheKey = options.getCacheKey?.(source);

    if (cacheKey !== undefined) {
      const cachedValue = readCachedValue(cacheKey);

      if (cachedValue !== undefined) {
        state.set({
          status: "resolved",
          loading: false,
          data: cachedValue,
          error: undefined,
        });
        return;
      }
    }

    const runId = requestId + 1;
    requestId = runId;

    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    state.set({
      status: "pending",
      loading: true,
      data:
        options.keepStaleWhileRefreshing === false
          ? undefined
          : state.get().data,
      error: undefined,
    });

    try {
      const value = await options.load(source, controller.signal);

      if (disposed || controller.signal.aborted || runId !== requestId) {
        return;
      }

      if (cacheKey !== undefined) {
        cache.set(cacheKey, value, options.cacheTimeMs);
      }

      state.set({
        status: "resolved",
        loading: false,
        data: value,
        error: undefined,
      });
    } catch (error) {
      if (disposed || controller.signal.aborted || runId !== requestId) {
        return;
      }

      state.set({
        status: "rejected",
        loading: false,
        data: state.get().data,
        error,
      });
    }
  };

  const scheduleRun = (): Promise<void> => {
    if ((options.debounceMs ?? 0) <= 0) {
      return run();
    }

    if (!pendingDebouncePromise) {
      pendingDebouncePromise = new Promise((resolve) => {
        resolvePendingDebouncePromise = resolve;
      });
    }

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      debounceTimeout = undefined;
      void run().finally(() => {
        settlePendingDebounce();
      });
    }, options.debounceMs);

    return pendingDebouncePromise;
  };

  const unsubscribe = options.source
    ? options.source.on(() => {
        void scheduleRun();
      })
    : undefined;

  if (options.immediate !== false) {
    void scheduleRun();
  }

  return {
    state,
    invalidate(cacheKey?: string): void {
      if (cacheKey !== undefined) {
        cache.delete(cacheKey);
        return;
      }

      const activeCacheKey = getActiveCacheKey();
      if (activeCacheKey !== undefined) {
        cache.delete(activeCacheKey);
        return;
      }

      cache.clear();
    },
    reload(): Promise<void> {
      return scheduleRun();
    },
    dispose(): void {
      disposed = true;
      activeController?.abort();
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = undefined;
      }
      settlePendingDebounce();
      unsubscribe?.();
    },
  };
}

export function createDebouncedResource<TSource, TValue>(
  options: CreateBeatDebouncedResourceOptions<TSource, TValue>,
): BeatResource<TValue> {
  return createResource(options);
}

export function createStaleWhileRefreshResource<TSource, TValue>(
  options: CreateBeatResourceOptions<TSource, TValue>,
): BeatResource<TValue> {
  return createResource({
    ...options,
    keepStaleWhileRefreshing: true,
  });
}

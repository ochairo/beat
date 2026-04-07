import type { Pulse, PulseMutation } from "@ochairo/pulse";
import {
  bindClass,
  bindProperty,
  bindStyle,
  bindText,
  composeCleanup,
  on,
  type BeatCleanup,
  type BeatRendered,
} from "./dom.js";

export const Fragment = Symbol.for("@ochairo/beat/Fragment");

export type BeatJsxChild =
  | BeatRendered<Node>
  | Node
  | Pulse<unknown>
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | readonly BeatJsxChild[];

export type BeatComponent<TProps = Record<string, unknown>> = (
  props: TProps,
) => BeatJsxChild;

export interface BeatJsxProps {
  readonly children?: BeatJsxChild;
  readonly class?: unknown;
  readonly className?: unknown;
  readonly ref?: ((node: Node) => void) | undefined;
  readonly style?: Record<string, string | number> | string | undefined;
  readonly [key: string]: unknown;
}

export interface ShowProps<TValue> {
  readonly when: Pulse<TValue>;
  readonly children: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly fallback?: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly mapValue?: (value: TValue) => boolean;
}

export interface BeatScope {
  readonly cleanups: BeatCleanup[];
}

export interface ForProps<TValue> {
  readonly each: Pulse<readonly TValue[]>;
  readonly children: (value: Pulse<TValue>, index: number) => BeatJsxChild;
  readonly key?: (value: TValue, index: number) => PropertyKey;
}

interface BeatForEntry<TValue> {
  readonly key: PropertyKey;
  value: TValue;
  readonly start: Comment;
  readonly end: Comment;
  readonly cleanup: BeatCleanup;
}

const noop = (): void => {};
const scopeStack: BeatScope[] = [];

function isPulseLike(value: unknown): value is Pulse<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { get?: unknown }).get === "function" &&
    typeof (value as { on?: unknown }).on === "function"
  );
}

function isBeatRendered(value: unknown): value is BeatRendered<Node> {
  return (
    typeof value === "object" &&
    value !== null &&
    "node" in value &&
    (value as { node?: unknown }).node instanceof Node
  );
}

function normalizeRendered(child: BeatJsxChild): BeatRendered<Node> {
  if (child === null || child === undefined || typeof child === "boolean") {
    return { node: document.createDocumentFragment() };
  }

  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    return { node: document.createTextNode(String(child)) };
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    const cleanups: BeatCleanup[] = [];

    for (const nestedChild of child) {
      const rendered = normalizeRendered(nestedChild);
      fragment.append(rendered.node);
      cleanups.push(rendered.cleanup ?? noop);
    }

    return {
      node: fragment,
      cleanup: composeCleanup(...cleanups),
    };
  }

  if (isPulseLike(child)) {
    return bindText(child);
  }

  if (child instanceof Node) {
    return { node: child };
  }

  if (isBeatRendered(child)) {
    return child;
  }

  throw new Error("Unsupported Beat JSX child");
}

function applyPropertyOrAttribute(
  element: Element,
  propertyName: string,
  value: unknown,
): void {
  createPropertyOrAttributeApplier(element, propertyName)(value);
}

function createPropertyOrAttributeApplier(
  element: Element,
  propertyName: string,
): (value: unknown) => void {
  const dynamicElement = element as unknown as Record<string, unknown>;
  const writeAsProperty =
    propertyName in element &&
    !propertyName.startsWith("data-") &&
    !propertyName.startsWith("aria-");

  if (propertyName === "className") {
    const applyClass = createPropertyOrAttributeApplier(element, "class");
    return (value: unknown): void => {
      applyClass(value);
    };
  }

  if (propertyName === "class") {
    return (value: unknown): void => {
      if (value === null || value === undefined || value === false) {
        element.removeAttribute("class");
        return;
      }

      element.setAttribute("class", String(value));
    };
  }

  if (propertyName === "style") {
    return (value: unknown): void => {
      if (typeof value === "string") {
        element.setAttribute("style", value);
        return;
      }

      if (
        typeof value === "object" &&
        value !== null &&
        element instanceof HTMLElement
      ) {
        for (const [styleName, styleValue] of Object.entries(value)) {
          element.style.setProperty(styleName, String(styleValue));
        }
      }
    };
  }

  return (value: unknown): void => {
    if (value === null || value === undefined) {
      element.removeAttribute(propertyName);
      if (writeAsProperty) {
        dynamicElement[propertyName] = undefined;
      }
      return;
    }

    if (value === false) {
      element.removeAttribute(propertyName);
      if (writeAsProperty) {
        dynamicElement[propertyName] = false;
        return;
      }

      return;
    }

    if (value === true) {
      element.setAttribute(propertyName, "");
      if (writeAsProperty) {
        dynamicElement[propertyName] = true;
      }
      return;
    }

    if (writeAsProperty) {
      dynamicElement[propertyName] = value;
      return;
    }

    element.setAttribute(propertyName, String(value));
  };
}

function appendChildren(
  parent: Element | DocumentFragment,
  children: BeatJsxChild,
): BeatCleanup | undefined {
  const rendered = normalizeRendered(children);
  parent.append(rendered.node);
  return rendered.cleanup;
}

function applyBindingClassValue(
  element: Element,
  className: string,
  value: unknown,
): void {
  element.classList.toggle(className, Boolean(value));
}

function applyBindingStyleValue(
  element: Element,
  propertyName: string,
  value: unknown,
): void {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (value === null || value === undefined || value === false) {
    element.style.removeProperty(propertyName);
    return;
  }

  element.style.setProperty(propertyName, String(value));
}

function applyInternalBindings(
  element: Element,
  propertyName: string,
  value: unknown,
  cleanups: BeatCleanup[],
): boolean {
  if (propertyName === "__beatText") {
    cleanups.push(appendChildren(element, value as BeatJsxChild) ?? noop);
    return true;
  }

  if (
    propertyName === "__beatClassBindings" ||
    propertyName === "__beatStyleBindings" ||
    propertyName === "__beatPropertyBindings"
  ) {
    if (typeof value !== "object" || value === null) {
      return true;
    }

    for (const [bindingName, bindingValue] of Object.entries(value)) {
      if (propertyName === "__beatClassBindings") {
        if (isPulseLike(bindingValue)) {
          cleanups.push(bindClass(element, bindingName, bindingValue));
        } else {
          applyBindingClassValue(element, bindingName, bindingValue);
        }
        continue;
      }

      if (propertyName === "__beatStyleBindings") {
        if (isPulseLike(bindingValue) && element instanceof HTMLElement) {
          cleanups.push(bindStyle(element, bindingName, bindingValue));
        } else {
          applyBindingStyleValue(element, bindingName, bindingValue);
        }
        continue;
      }

      if (isPulseLike(bindingValue)) {
        cleanups.push(bindProperty(element, bindingName, bindingValue));
      } else {
        applyPropertyOrAttribute(element, bindingName, bindingValue);
      }
    }

    return true;
  }

  return false;
}

function clearBetween(start: Comment, end: Comment): void {
  let current = start.nextSibling;

  while (current && current !== end) {
    const nextSibling = current.nextSibling;
    current.remove();
    current = nextSibling;
  }
}

function getRequiredArrayItemPulse<TValue>(
  items: Pulse<readonly TValue[]>,
  index: number,
): Pulse<TValue> {
  const child = items[index];

  if (!child) {
    throw new Error(`Missing pulse item at index ${index}`);
  }

  return child as Pulse<TValue>;
}

function renderEntry<TValue>(
  items: Pulse<readonly TValue[]>,
  value: TValue,
  index: number,
  key: PropertyKey,
  renderItem: (value: Pulse<TValue>, index: number) => BeatJsxChild,
): { entry: BeatForEntry<TValue>; fragment: DocumentFragment } {
  const item = getRequiredArrayItemPulse(items, index);
  const rendered = normalizeRendered(renderItem(item, index));
  const start = document.createComment("beat-entry-start");
  const end = document.createComment("beat-entry-end");
  const fragment = document.createDocumentFragment();
  fragment.append(start, rendered.node, end);

  return {
    entry: {
      key,
      value,
      start,
      end,
      cleanup: rendered.cleanup ?? noop,
    },
    fragment,
  };
}

function isStructuralArrayChange(changes: readonly PulseMutation[]): boolean {
  return changes.some((change) => {
    const segment = change.path[0];
    return (
      change.path.length === 0 ||
      segment === "length" ||
      typeof segment === "number"
    );
  });
}

export function component<TProps>(
  setup: BeatComponent<TProps>,
): BeatComponent<TProps> {
  return (props: TProps) => {
    const scope: BeatScope = {
      cleanups: [],
    };

    scopeStack.push(scope);

    try {
      const result = setup(props);

      if (scope.cleanups.length === 0) {
        return result;
      }

      const rendered = normalizeRendered(result);
      return {
        node: rendered.node,
        cleanup: composeCleanup(rendered.cleanup, ...scope.cleanups),
      };
    } finally {
      scopeStack.pop();
    }
  };
}

export function onCleanup(cleanup: BeatCleanup): void {
  const currentScope = scopeStack[scopeStack.length - 1];

  if (!currentScope) {
    throw new Error("onCleanup must run inside a Beat component scope");
  }

  currentScope.cleanups.push(cleanup);
}

export function show<TValue>(
  condition: Pulse<TValue>,
  renderWhenTrue: BeatJsxChild | ((value: TValue) => BeatJsxChild),
  renderWhenFalse?: BeatJsxChild | ((value: TValue) => BeatJsxChild),
  mapValue: (value: TValue) => boolean = (value) => Boolean(value),
): BeatRendered<DocumentFragment> {
  const fragment = document.createDocumentFragment();
  const start = document.createComment("beat-show-start");
  const end = document.createComment("beat-show-end");
  let cleanupCurrentBranch: BeatCleanup = noop;

  const renderBranch = (value: TValue): void => {
    cleanupCurrentBranch();
    cleanupCurrentBranch = noop;
    clearBetween(start, end);

    const branch = mapValue(value) ? renderWhenTrue : renderWhenFalse;
    if (branch === undefined) {
      return;
    }

    const rendered = normalizeRendered(
      typeof branch === "function"
        ? (branch as (value: TValue) => BeatJsxChild)(value)
        : branch,
    );

    end.parentNode?.insertBefore(rendered.node, end);
    cleanupCurrentBranch = rendered.cleanup ?? noop;
  };

  fragment.append(start, end);
  renderBranch(condition.get());

  const unsubscribe = condition.on((event) => {
    renderBranch(event.currentValue);
  });

  return {
    node: fragment,
    cleanup: () => {
      unsubscribe();
      cleanupCurrentBranch();
      clearBetween(start, end);
      start.remove();
      end.remove();
    },
  };
}

export function forEach<TValue>(
  items: Pulse<readonly TValue[]>,
  renderItem: (value: Pulse<TValue>, index: number) => BeatJsxChild,
  getKey: (value: TValue, index: number) => PropertyKey = (_, index) => index,
): BeatRendered<DocumentFragment> {
  const fragment = document.createDocumentFragment();
  const start = document.createComment("beat-for-start");
  const end = document.createComment("beat-for-end");
  let entries: BeatForEntry<TValue>[] = [];

  const updateStableEntries = (values: readonly TValue[]): boolean => {
    if (entries.length !== values.length) {
      return false;
    }

    for (const [index, value] of values.entries()) {
      const entry = entries[index];

      if (!entry || !Object.is(entry.key, getKey(value, index))) {
        return false;
      }
    }

    for (const [index, value] of values.entries()) {
      const entry = entries[index];

      if (!entry) {
        return false;
      }

      if (!Object.is(entry.value, value)) {
        entry.value = value;
      }
    }

    return true;
  };

  const mountEntries = (values: readonly TValue[], container: Node): void => {
    if (updateStableEntries(values)) {
      return;
    }

    for (const entry of entries) {
      entry.cleanup();
    }

    clearBetween(start, end);

    const orderedEntries: BeatForEntry<TValue>[] = [];
    const orderedNodes = document.createDocumentFragment();

    for (const [index, value] of values.entries()) {
      const key = getKey(value, index);
      const nextEntry = renderEntry(items, value, index, key, renderItem);
      orderedEntries.push(nextEntry.entry);
      orderedNodes.append(nextEntry.fragment);
    }

    if (container instanceof DocumentFragment) {
      container.insertBefore(orderedNodes, end);
    } else {
      container.insertBefore(orderedNodes, end);
    }

    entries = orderedEntries;
  };

  fragment.append(start, end);
  mountEntries(items.get(), fragment);

  const unsubscribe = items.on((event) => {
    if (isStructuralArrayChange(event.changes)) {
      const parent = end.parentNode;
      if (!parent) {
        return;
      }

      mountEntries(event.currentValue, parent);
      return;
    }

    updateStableEntries(event.currentValue);
  });

  return {
    node: fragment,
    cleanup: () => {
      unsubscribe();
      for (const entry of entries) {
        entry.cleanup();
      }
      clearBetween(start, end);
      start.remove();
      end.remove();
      entries = [];
    },
  };
}

export function Show<TValue>(
  props: ShowProps<TValue>,
): BeatRendered<DocumentFragment> {
  return show(props.when, props.children, props.fallback, props.mapValue);
}

export function For<TValue>(
  props: ForProps<TValue>,
): BeatRendered<DocumentFragment> {
  return forEach(props.each, props.children, props.key);
}

export function toRendered(child: BeatJsxChild): BeatRendered<Node> {
  return normalizeRendered(child);
}

export function jsx<TProps>(
  type: string | typeof Fragment | BeatComponent<TProps>,
  props: TProps,
  _key?: PropertyKey,
): BeatJsxChild {
  const resolvedProps = (props ?? ({} as TProps)) as TProps & BeatJsxProps;

  if (type === Fragment) {
    return resolvedProps.children ?? null;
  }

  if (typeof type === "function") {
    return type(resolvedProps);
  }

  const element = document.createElement(type);
  const cleanups: BeatCleanup[] = [];

  for (const [propertyName, value] of Object.entries(resolvedProps)) {
    if (propertyName === "children" || propertyName === "key") {
      continue;
    }

    if (applyInternalBindings(element, propertyName, value, cleanups)) {
      continue;
    }

    if (propertyName === "ref") {
      if (typeof value === "function") {
        value(element);
      }
      continue;
    }

    if (propertyName.startsWith("on") && typeof value === "function") {
      const eventName = propertyName.slice(2).toLowerCase();
      cleanups.push(on(element, eventName, value as EventListener));
      continue;
    }

    if (isPulseLike(value)) {
      const applyValue = createPropertyOrAttributeApplier(
        element,
        propertyName,
      );

      applyValue(value.get());
      cleanups.push(
        value.on((event) => {
          applyValue(event.currentValue);
        }),
      );
      continue;
    }

    applyPropertyOrAttribute(element, propertyName, value);
  }

  if (resolvedProps.children !== undefined) {
    cleanups.push(appendChildren(element, resolvedProps.children) ?? noop);
  }

  return {
    node: element,
    cleanup: composeCleanup(...cleanups),
  };
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export namespace JSX {
  export type Element = BeatJsxChild;
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicAttributes {}
  export interface IntrinsicElements {
    readonly [name: string]: BeatJsxProps;
  }
}

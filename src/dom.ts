import type { Pulse, PulseMutation } from "@ochairo/pulse";

export type BeatCleanup = () => void;

export interface BeatRendered<TNode extends Node = Node> {
  readonly node: TNode;
  readonly cleanup?: BeatCleanup;
}

export type BeatFieldBindings<TValue extends object> = Partial<{
  [TKey in keyof TValue]: (value: TValue[TKey]) => void;
}>;

export interface BeatMaskedBinding<TValue> {
  readonly fullMask: number;
  getChangeMask(changes: readonly PulseMutation[]): number;
  apply(value: TValue, mask: number): void;
}

export type BeatObjectMaskMap<TValue extends object> = Partial<
  Record<Extract<keyof TValue, string>, number>
>;

const noop = (): void => {};

function defaultTextFormat<TValue>(value: TValue): string {
  return String(value);
}

function defaultClassMap<TValue>(value: TValue): boolean {
  return Boolean(value);
}

function defaultStyleMap<TValue>(value: TValue): string {
  return String(value);
}

function canWriteAsProperty(element: Element, propertyName: string): boolean {
  return (
    propertyName in element &&
    !propertyName.startsWith("data-") &&
    !propertyName.startsWith("aria-")
  );
}

function createPropertyWriter(
  element: Element,
  propertyName: string,
): (value: unknown) => void {
  const dynamicElement = element as unknown as Record<string, unknown>;
  const writeAsProperty = canWriteAsProperty(element, propertyName);

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

function isStructuralArrayChange(changes: readonly PulseMutation[]): boolean {
  return changes.some((change) => {
    const segment = change.path[0];
    return (
      segment === "length" ||
      (typeof segment === "number" && change.path.length === 1)
    );
  });
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

function normalizeRendered<TNode extends Node>(
  rendered: TNode | BeatRendered<TNode>,
): BeatRendered<TNode> {
  if (rendered instanceof Node) {
    return { node: rendered };
  }

  return rendered;
}

function runCleanups(cleanups: readonly BeatCleanup[]): void {
  for (const cleanup of cleanups) {
    cleanup();
  }
}

export function composeCleanup(
  ...cleanups: Array<BeatCleanup | undefined>
): BeatCleanup {
  return () => {
    for (const cleanup of cleanups) {
      cleanup?.();
    }
  };
}

export function bindText<TValue>(
  node: Pulse<TValue>,
  formatValue: (value: TValue) => string = defaultTextFormat,
  onChange?: (value: TValue) => void,
): BeatRendered<Text> {
  let currentText = formatValue(node.get());
  const textNode = document.createTextNode(currentText);
  const unsubscribe = node.on((event) => {
    const nextText = formatValue(event.currentValue);
    if (nextText === currentText) {
      return;
    }

    currentText = nextText;
    textNode.data = nextText;
    onChange?.(event.currentValue);
  });

  return {
    node: textNode,
    cleanup: unsubscribe,
  };
}

export function bindFields<TValue extends object>(
  node: Pulse<TValue>,
  bindings: BeatFieldBindings<TValue>,
): BeatCleanup {
  const entries = Object.entries(bindings) as Array<
    [keyof TValue, (value: TValue[keyof TValue]) => void]
  >;
  const applyByKey = new Map<
    PropertyKey,
    (value: TValue[keyof TValue]) => void
  >(entries);
  let currentValue = node.get();

  for (const [key, apply] of entries) {
    apply(currentValue[key]);
  }

  return node.on((event) => {
    const nextValue = event.currentValue;
    const changeCount = event.changes.length;

    if (changeCount === 1) {
      const [change] = event.changes;
      const key = change?.key;

      if (key !== undefined && typeof key !== "symbol") {
        const apply = applyByKey.get(key);

        if (apply) {
          apply(nextValue[key as keyof TValue]);
          currentValue = nextValue;
          return;
        }
      }
    }

    const changedKeys: Array<keyof TValue> = [];
    let canUseChangeKeys = changeCount > 0;

    for (const change of event.changes) {
      const key = change.key;

      if (key === undefined || typeof key === "symbol") {
        canUseChangeKeys = false;
        break;
      }

      const apply = applyByKey.get(key);

      if (!apply) {
        canUseChangeKeys = false;
        break;
      }

      const typedKey = key as keyof TValue;

      if (
        !changedKeys.some((existingKey) => Object.is(existingKey, typedKey))
      ) {
        changedKeys.push(typedKey);
      }
    }

    if (canUseChangeKeys) {
      for (const key of changedKeys) {
        applyByKey.get(key)?.(nextValue[key]);
      }

      currentValue = nextValue;
      return;
    }

    for (const [key, apply] of entries) {
      const previousField = currentValue[key];
      const nextField = nextValue[key];

      if (!Object.is(previousField, nextField)) {
        apply(nextField);
      }
    }

    currentValue = nextValue;
  });
}

export function bindMasked<TValue>(
  node: Pulse<TValue>,
  binding: BeatMaskedBinding<TValue>,
): BeatCleanup {
  binding.apply(node.get(), binding.fullMask);

  return node.on((event) => {
    const mask =
      event.changes.length === 0
        ? binding.fullMask
        : binding.getChangeMask(event.changes);

    if (mask !== 0) {
      binding.apply(event.currentValue, mask);
    }
  });
}

export function createObjectKeyMask<TValue extends object>(
  maskByKey: BeatObjectMaskMap<TValue>,
  fullMask: number,
): (changes: readonly PulseMutation[]) => number {
  return (changes) => {
    let mask = 0;

    for (const change of changes) {
      const key = change.key;

      if (typeof key !== "string") {
        return fullMask;
      }

      const bit = maskByKey[key as Extract<keyof TValue, string>];

      if (bit === undefined) {
        return fullMask;
      }

      mask |= bit;
    }

    return mask;
  };
}

export function bindClass<TValue>(
  element: Element,
  className: string,
  node: Pulse<TValue>,
  mapValue: (value: TValue) => boolean = defaultClassMap,
  onChange?: (value: TValue) => void,
): BeatCleanup {
  let currentValue = mapValue(node.get());

  const apply = (value: TValue): void => {
    const nextValue = mapValue(value);
    if (nextValue === currentValue) {
      return;
    }

    currentValue = nextValue;
    element.classList.toggle(className, nextValue);
    onChange?.(value);
  };

  element.classList.toggle(className, currentValue);
  return node.on((event) => {
    apply(event.currentValue);
  });
}

export function bindClasses<TValue>(
  element: Element,
  node: Pulse<TValue>,
  mapValue: (value: TValue) => Record<string, boolean>,
  onChange?: (value: TValue) => void,
): BeatCleanup {
  let currentClasses = mapValue(node.get());

  for (const [className, enabled] of Object.entries(currentClasses)) {
    element.classList.toggle(className, enabled);
  }

  return node.on((event) => {
    const nextClasses = mapValue(event.currentValue);

    for (const [className, enabled] of Object.entries(nextClasses)) {
      if (currentClasses[className] !== enabled) {
        element.classList.toggle(className, enabled);
      }
    }

    currentClasses = nextClasses;
    onChange?.(event.currentValue);
  });
}

export function bindStyle<TValue>(
  element: HTMLElement,
  propertyName: string,
  node: Pulse<TValue>,
  mapValue: (value: TValue) => string = defaultStyleMap,
  onChange?: (value: TValue) => void,
): BeatCleanup {
  let currentValue = mapValue(node.get());

  const apply = (value: TValue): void => {
    const nextValue = mapValue(value);
    if (nextValue === currentValue) {
      return;
    }

    currentValue = nextValue;
    element.style.setProperty(propertyName, nextValue);
    onChange?.(value);
  };

  element.style.setProperty(propertyName, currentValue);
  return node.on((event) => {
    apply(event.currentValue);
  });
}

export function bindProperty<TValue>(
  element: Element,
  propertyName: string,
  node: Pulse<TValue>,
  mapValue: (value: TValue) => unknown = (value) => value,
  onChange?: (value: TValue) => void,
): BeatCleanup {
  let currentValue = mapValue(node.get());
  const writeValue = createPropertyWriter(element, propertyName);
  writeValue(currentValue);

  return node.on((event) => {
    const nextValue = mapValue(event.currentValue);
    if (Object.is(nextValue, currentValue)) {
      return;
    }

    currentValue = nextValue;
    writeValue(nextValue);
    onChange?.(event.currentValue);
  });
}

export function on<TElement extends EventTarget>(
  element: TElement,
  eventName: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean,
): BeatCleanup {
  element.addEventListener(eventName, handler, options);
  return () => {
    element.removeEventListener(eventName, handler, options);
  };
}

export function mountEach<TValue>(
  parent: Element,
  items: Pulse<readonly TValue[]>,
  renderItem: (item: Pulse<TValue>, index: number) => Node | BeatRendered<Node>,
): BeatCleanup {
  let itemCleanups: BeatCleanup[] = [];

  const renderAll = (): void => {
    runCleanups(itemCleanups);
    itemCleanups = [];

    const fragment = document.createDocumentFragment();
    const values = items.get();

    for (let index = 0; index < values.length; index += 1) {
      const itemPulse = getRequiredArrayItemPulse(items, index);
      const rendered = normalizeRendered(renderItem(itemPulse, index));
      itemCleanups.push(rendered.cleanup ?? noop);
      fragment.append(rendered.node);
    }

    parent.replaceChildren(fragment);
  };

  renderAll();

  const unsubscribe = items.on((event) => {
    if (isStructuralArrayChange(event.changes)) {
      renderAll();
    }
  });

  return () => {
    unsubscribe();
    runCleanups(itemCleanups);
    itemCleanups = [];
    parent.replaceChildren();
  };
}

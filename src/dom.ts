import type { Pulse } from "@ochairo/pulse";

export type BeatCleanup = () => void;

export interface BeatRendered<TNode extends Node = Node> {
  readonly node: TNode;
  readonly cleanup?: BeatCleanup;
}

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
  // SVG IDL attributes (e.g. viewBox, transform) are read-only object wrappers
  // (SVGAnimatedXxx) — always use setAttribute for SVG elements.
  if (element instanceof SVGElement) {
    return false;
  }

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

export function bindStyle<TValue>(
  element: HTMLElement | SVGElement,
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

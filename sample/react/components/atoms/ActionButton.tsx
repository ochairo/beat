import type { JSX } from "react";

interface ActionButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onClick: () => void | Promise<void>;
}

export function ActionButton(props: ActionButtonProps): JSX.Element {
  return (
    <button
      className="button"
      type="button"
      title={props.hint}
      aria-label={`${props.label}. ${props.hint}`}
      onClick={props.onClick}
    >
      <span className="button__label">{props.label}</span>
    </button>
  );
}

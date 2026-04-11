/** @jsxImportSource @ochairo/beat */
import { component } from "@ochairo/beat";

interface ActionButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onClick: () => void | Promise<void>;
}

export const ActionButton = component<ActionButtonProps>((props) => {
  return (
    <button
      type="button"
      class="button"
      title={props.hint}
      aria-label={`${props.label}. ${props.hint}`}
      onClick={props.onClick}
    >
      <span class="button__label">{props.label}</span>
    </button>
  );
});

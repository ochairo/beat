interface ActionButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onClick: () => void | Promise<void>;
}

export function ActionButton(props: ActionButtonProps): JSX.Element {
  return (
    <button class="button" type="button" onClick={props.onClick}>
      <span class="button__label">{props.label}</span>
      <span class="button__hint">{props.hint}</span>
    </button>
  );
}

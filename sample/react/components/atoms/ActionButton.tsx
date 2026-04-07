interface ActionButtonProps {
  readonly label: string;
  readonly hint: string;
  readonly onClick: () => void | Promise<void>;
}

export function ActionButton(props: ActionButtonProps): JSX.Element {
  return (
    <button className="button" type="button" onClick={props.onClick}>
      <span className="button__label">{props.label}</span>
      <span className="button__hint">{props.hint}</span>
    </button>
  );
}

import type { NoteItem } from "../../types.js";

interface WhyItFeelsFastPanelProps {
  readonly items: readonly NoteItem[];
}

export function WhyItFeelsFastPanel(
  props: WhyItFeelsFastPanelProps,
): JSX.Element {
  return (
    <section className="panel">
      <div className="panel__title">
        <h3>Why it feels fast</h3>
        <span className="panel__subtitle">
          What the demo is trying to make obvious
        </span>
      </div>
      <ul className="note-list">
        {props.items.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
/** @jsxImportSource @ochairo/beat */
import { component } from "@ochairo/beat";
import type { NoteItem } from "../../types.js";

interface WhyItFeelsFastPanelProps {
  readonly items: readonly NoteItem[];
}

export const WhyItFeelsFastPanel = component<WhyItFeelsFastPanelProps>(
  (props) => {
    return (
      <section class="panel">
        <div class="panel__title">
          <h3>Why it feels fast</h3>
          <span class="panel__subtitle">
            What the demo is trying to make obvious
          </span>
        </div>

        <ul class="note-list">
          {props.items.map((item) => (
            <li>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  },
);
import { motion } from "motion/react";
import type { MaterialNote } from "../data/materials.ts";
import { surface } from "../media.ts";
import type { Locale } from "../types.ts";

interface Props {
  readonly note: MaterialNote;
  readonly locale: Locale;
  readonly actionLabel: string;
  readonly onSelect: () => void;
}

// A material note set into the grid at the width of two tiles.
export function EditorialTile({ note, locale, actionLabel, onSelect }: Props) {
  return (
    <motion.li
      className="note-tile"
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
    >
      <div className="note-surface" style={{ backgroundImage: `url(${surface(note.texture)})` }} aria-hidden="true" />
      <div className="note-body">
        <h3>{note.title[locale]}</h3>
        <p>{note.text[locale]}</p>
        <button type="button" className="text-button" onClick={onSelect}>
          {actionLabel}
        </button>
      </div>
    </motion.li>
  );
}

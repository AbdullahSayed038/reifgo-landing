import { useRef, useState } from "react";

/**
 * Drag-to-rearrange for a vertical list, started from a grip handle.
 *
 * The row only becomes draggable while the pointer is held on its grip. Making
 * the whole row draggable — as the media list does — is fine for rows of plain
 * text, but on a row holding inputs or a textarea (an FAQ answer) the browser
 * starts a row drag instead of selecting text inside the field.
 *
 * `onMove(from, to)` receives array indexes; the caller owns the array.
 *
 *   const drag = useDragReorder((from, to) => onChange(moveItem(rows, from, to)));
 *   <li {...drag.rowProps(i)} className={drag.rowClass(i)}>
 *     <span {...drag.handleProps(i)}>⋮⋮</span>
 */
export function useDragReorder(onMove) {
  // The ref is what the drop reads: dragstart and drop can land in the same
  // render tick, before a state update from dragstart would be visible.
  const fromRef = useRef(null);
  const [armed, setArmed] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const reset = () => {
    fromRef.current = null;
    setArmed(null);
    setDragFrom(null);
    setDragOver(null);
  };

  const handleProps = (i) => ({
    onPointerDown: () => setArmed(i),
    onPointerUp: () => setArmed(null),
    "aria-hidden": true,
  });

  const rowProps = (i) => ({
    draggable: armed === i,
    onDragStart: (e) => {
      fromRef.current = i;
      setDragFrom(i);
      e.dataTransfer.effectAllowed = "move";
      // Firefox will not begin a drag without some data attached.
      e.dataTransfer.setData("text/plain", String(i));
    },
    onDragOver: (e) => {
      if (fromRef.current == null) return;
      // Without preventDefault the browser refuses the drop.
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOver !== i) setDragOver(i);
    },
    onDragLeave: () => setDragOver((v) => (v === i ? null : v)),
    onDrop: (e) => {
      e.preventDefault();
      const from = fromRef.current;
      if (from != null && from !== i) onMove(from, i);
      reset();
    },
    onDragEnd: reset,
  });

  const rowClass = (i) =>
    [dragFrom === i && "is-dragging", dragOver === i && dragFrom !== i && "is-drop-target"]
      .filter(Boolean)
      .join(" ");

  return { handleProps, rowProps, rowClass };
}

/** A copy of `list` with the item at `from` moved to `to`. */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

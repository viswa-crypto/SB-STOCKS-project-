import { useDragControls, Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

// A single reorderable dashboard widget. The grip handle is the only drag
// trigger (dragListener=false on the Reorder.Item) so buttons/links inside
// the widget body stay fully clickable.
export default function WidgetShell({ id, title, action, children }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="mb-10"
      whileDrag={{ scale: 1.01, zIndex: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Drag to reorder ${title}`}
            className="cursor-grab active:cursor-grabbing text-mute hover:text-mint transition-colors touch-none"
          >
            <GripVertical size={16} />
          </button>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </Reorder.Item>
  );
}

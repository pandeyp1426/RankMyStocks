import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./popup.css";

export function Popup({
  trigger,
  setTrigger,
  children,
  dimBackground = true,
}) {
  useEffect(() => {
    if (!trigger) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [trigger]);

  if (!trigger) return "";

  const overlayClass = dimBackground
    ? "popup-overlay"
    : "popup-overlay popup-overlay--clear";

  return createPortal(
    <div className={overlayClass} onClick={() => setTrigger(false)}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-inner">
          <button className="close-btn" onClick={() => setTrigger(false)}>
            ×
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

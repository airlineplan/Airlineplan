import { useEffect } from "react";

export default function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, onEscape]);
}

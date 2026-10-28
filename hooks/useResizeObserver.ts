"use client";
/**
 * Observes an element's size and returns { width, height }.
 * Updates on every resize via ResizeObserver.
 * Returns a callback ref (compatible with any element ref prop).
 */
import { useEffect, useRef, useState, useCallback } from "react";

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends Element>(): [
  React.RefCallback<T>,
  Size
] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observerRef.current.observe(node);

    // Fire immediately
    const rect = node.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
  }, []);

  return [ref, size];
}

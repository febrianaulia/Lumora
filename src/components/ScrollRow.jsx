import { useRef, useState, useEffect, useCallback } from "react";

/**
 * Netflix-style horizontal row: smooth scroll, glass arrow buttons that
 * appear on hover, and edge fade that only shows when there is more to see.
 */
export default function ScrollRow({ children }) {
  const ref = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  const scrollByPage = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div
      className={
        "row-wrap" +
        (canPrev ? " can-prev" : "") +
        (canNext ? " can-next" : "")
      }
    >
      <button
        className="row-arrow row-arrow--prev"
        onClick={() => scrollByPage(-1)}
        aria-label="Previous"
        tabIndex={-1}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="row-track" ref={ref} onScroll={update}>
        {children}
      </div>
      <button
        className="row-arrow row-arrow--next"
        onClick={() => scrollByPage(1)}
        aria-label="Next"
        tabIndex={-1}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MediaCard from "./MediaCard";
import ScrollRow from "./ScrollRow";
import { tmdbFetch } from "../utils/api";
import { useRatings, getRatingForItem } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";

const ACCENT = "#ff6a3d";

// TMDB movie genre ids. Order = order of the chips. Each genre has its own tint.
export const GENRES = [
  { id: 28, name: "Action", color: "#ff6a3d" },
  { id: 53, name: "Thriller", color: "#2dd4bf" },
  { id: 35, name: "Comedy", color: "#fbbf24" },
  { id: 27, name: "Horror", color: "#ef4444" },
  { id: 878, name: "Sci-Fi", color: "#60a5fa" },
  { id: 12, name: "Adventure", color: "#34d399" },
  { id: 10749, name: "Romance", color: "#f472b6" },
  { id: 18, name: "Drama", color: "#a78bfa" },
  { id: 16, name: "Animation", color: "#fb923c" },
  { id: 80, name: "Crime", color: "#94a3b8" },
  { id: 9648, name: "Mystery", color: "#818cf8" },
  { id: 14, name: "Fantasy", color: "#c084fc" },
  { id: 10751, name: "Family", color: "#86efac" },
  { id: 99, name: "Documentary", color: "#67e8f9" },
  { id: 10752, name: "War", color: "#a8a29e" },
  { id: "indonesian", name: "Indonesia", color: "#f97316" },
];

// Genres that get their own row on the Home page.
const ROW_GENRES = GENRES.slice(0, 8);

const genreColor = (id) => GENRES.find((g) => g.id === id)?.color || ACCENT;

const SORTS = [
  {
    id: "popular",
    label: "Popular",
    sub: "Most popular right now",
    params: () => "sort_by=popularity.desc&vote_count.gte=100",
  },
  {
    id: "top",
    label: "Top rated",
    sub: "Highest rated by audiences",
    params: () => "sort_by=vote_average.desc&vote_count.gte=500",
  },
  {
    id: "new",
    label: "Newest",
    sub: "Latest releases first",
    params: () =>
      "sort_by=primary_release_date.desc&vote_count.gte=50" +
      `&primary_release_date.lte=${new Date().toISOString().slice(0, 10)}`,
  },
];

const discoverPath = (genreId, page, sortId = "popular") => {
  const sort = SORTS.find((s) => s.id === sortId) || SORTS[0];
  const isIndonesian = genreId === "indonesian";
  const category = isIndonesian
    ? "with_origin_country=ID&with_original_language=id"
    : `with_genres=${genreId}`;
  const sortParams = isIndonesian && sort.id === "popular"
    ? "sort_by=popularity.desc"
    : sort.params();
  return (
    `/discover/movie?${category}&include_adult=false` +
    `&${sortParams}&page=${page}`
  );
};

const toMovies = (results) =>
  (results || [])
    .filter((m) => m && m.poster_path)
    .map((m) => ({ ...m, media_type: "movie" }));

function Card({ item, ratingsMap, ageLimitSetting, ...handlers }) {
  const r = getRatingForItem(item, ratingsMap);
  return (
    <MediaCard
      item={item}
      onClick={() => handlers.onSelect(item)}
      progress={0}
      watched={handlers.watched}
      onMarkWatched={handlers.onMarkWatched}
      onMarkUnwatched={handlers.onMarkUnwatched}
      ageRating={r.cert}
      restricted={isRestricted(r.minAge, ageLimitSetting)}
    />
  );
}

/**
 * Genre chips under the hero. A single highlight glides between chips,
 * takes the tint of the selected genre, and the bar turns into a glass band
 * that stays under the navbar once you scroll past it.
 */
export function GenreBar({ active, onChange }) {
  const barRef = useRef(null);
  const sentinelRef = useRef(null);
  const chipRefs = useRef({});
  const keyRef = useRef("all");
  const firstRun = useRef(true);
  const [ind, setInd] = useState({ x: 0, w: 0, show: false, animate: false });
  const [stuck, setStuck] = useState(false);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const key = active == null ? "all" : String(active);
  keyRef.current = key;
  const color = active == null ? ACCENT : genreColor(active);

  const updateScrollEdges = () => {
    const bar = barRef.current;
    if (!bar) return;
    setScrollEdges({
      left: bar.scrollLeft > 2,
      right: bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2,
    });
  };

  const scrollCategories = (direction) => {
    barRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  const measure = () => {
    const el = chipRefs.current[keyRef.current];
    if (!el) return;
    setInd((p) =>
      p.show && p.x === el.offsetLeft && p.w === el.offsetWidth
        ? p
        : { ...p, x: el.offsetLeft, w: el.offsetWidth, show: true },
    );
  };

  useLayoutEffect(() => {
    measure();
    if (firstRun.current) {
      firstRun.current = false;
      // turn transitions on only after the first position is painted
      requestAnimationFrame(() => setInd((p) => ({ ...p, animate: true })));
      return;
    }
    chipRefs.current[key]?.scrollIntoView?.({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, [key]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      measure();
      updateScrollEdges();
    });
    ro.observe(bar);
    bar.addEventListener("scroll", updateScrollEdges, { passive: true });
    updateScrollEdges();
    return () => {
      ro.disconnect();
      bar.removeEventListener("scroll", updateScrollEdges);
    };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 200),
      { rootMargin: "-96px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="genre-sentinel" aria-hidden="true" />
      <div className={"genre-bar-wrap" + (stuck ? " is-stuck" : "")} style={{ "--genre-c": color }}>
        <button
          type="button"
          className="genre-scroll-btn genre-scroll-btn--left"
          aria-label="Geser kategori ke kiri"
          disabled={!scrollEdges.left}
          onClick={() => scrollCategories(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div ref={barRef} className="genre-bar" aria-label="Browse movies by genre">
        <span
          className={
            "genre-ind" +
            (ind.show ? " is-shown" : "") +
            (ind.animate ? " is-animated" : "")
          }
          style={{ width: ind.w, transform: `translateX(${ind.x}px)` }}
          aria-hidden="true"
        />
        <button
          ref={(el) => {
            chipRefs.current.all = el;
          }}
          className={"genre-chip" + (active == null ? " is-active" : "")}
          aria-pressed={active == null}
          onClick={() => onChange(null)}
        >
          All
        </button>
        {GENRES.map((g) => (
          <button
            key={g.id}
            ref={(el) => {
              chipRefs.current[String(g.id)] = el;
            }}
            className={"genre-chip" + (active === g.id ? " is-active" : "")}
            aria-pressed={active === g.id}
            onClick={() => onChange(g.id)}
          >
            {g.name}
          </button>
        ))}
        </div>
        <button
          type="button"
          className="genre-scroll-btn genre-scroll-btn--right"
          aria-label="Geser kategori ke kanan"
          disabled={!scrollEdges.right}
          onClick={() => scrollCategories(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </>
  );
}

/** One horizontally scrolling row. Loads only when it nears the viewport. */
function GenreRow({ genre, apiKey, onSeeAll, ...handlers }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !apiKey) return undefined;
    let cancelled = false;
    tmdbFetch(discoverPath(genre.id, 1), apiKey)
      .then((d) => {
        if (!cancelled) setItems(toMovies(d.results).slice(0, 16));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, apiKey, genre.id]);

  const { ratingsMap, ageLimitSetting } = useRatings(items);

  if (done && items.length === 0) return null;

  return (
    <div
      className="section genre-row"
      ref={ref}
      style={{ "--genre-c": genre.color }}
    >
      <div className="section-title">
        <span className="genre-row__name">
          <i className="genre-dot" aria-hidden="true" />
          {genre.name}
        </span>
        <button className="genre-row__all" onClick={() => onSeeAll(genre.id)}>
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {items.length === 0 ? (
        <div className="genre-row__skeleton" aria-hidden="true" />
      ) : (
        <ScrollRow>
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
              {...handlers}
            />
          ))}
        </ScrollRow>
      )}
    </div>
  );
}

/** The default Home rows: Action, Thriller, Comedy, ... */
export function GenreRows({ apiKey, onSeeAll, ...handlers }) {
  return (
    <>
      {ROW_GENRES.map((g) => (
        <GenreRow
          key={g.id}
          genre={g}
          apiKey={apiKey}
          onSeeAll={onSeeAll}
          {...handlers}
        />
      ))}
    </>
  );
}

/**
 * Full page for one genre: tinted header, sort control, poster grid and
 * "Load more". Mount it with key={genreId} so state resets per genre.
 */
export function GenreResults({ genreId, apiKey, ...handlers }) {
  const genre = GENRES.find((g) => g.id === genreId);
  const [sort, setSort] = useState("popular");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!apiKey) return undefined;
    let cancelled = false;
    setLoading(true);
    tmdbFetch(discoverPath(genreId, page, sort), apiKey)
      .then((d) => {
        if (cancelled) return;
        const fresh = toMovies(d.results);
        setTotalPages(Math.min(d.total_pages || 1, 500));
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...fresh.filter((i) => !seen.has(i.id))];
        });
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, genreId, page, sort, attempt]);

  const { ratingsMap, ageLimitSetting } = useRatings(items);

  if (!genre) return null;

  const changeSort = (id) => {
    if (id === sort) return;
    setSort(id);
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setError(false);
    setLoading(true);
  };
  const sortInfo = SORTS.find((s) => s.id === sort) || SORTS[0];

  return (
    <div className="genre-results" style={{ "--genre-c": genre.color }}>
      <div className="genre-hero">
        <div className="genre-hero__glow" aria-hidden="true" />
        <div className="genre-hero__row">
          <div>
            <h2 className="genre-hero__title">{genre.name}</h2>
            <p className="genre-hero__sub">{sortInfo.sub}</p>
          </div>
          <div className="genre-seg" role="group" aria-label="Sort movies">
            {SORTS.map((s) => (
              <button
                key={s.id}
                aria-pressed={sort === s.id}
                onClick={() => changeSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="genre-results__grid cards-grid">
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{ display: "contents", "--i": idx % 20 }}
          >
            <Card
              item={item}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
              {...handlers}
            />
          </div>
        ))}
      </div>

      {loading && items.length === 0 && (
        <div className="loader">
          <div className="spinner" />
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="genre-results__note">
          No movies found for this genre.
        </div>
      )}
      {error && (
        <div className="genre-results__note">
          Could not load movies.{" "}
          <button
            className="genre-row__all"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {items.length > 0 && page < totalPages && (
        <button
          className="genre-more"
          disabled={loading}
          onClick={() => setPage((p) => p + 1)}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

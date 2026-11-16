import { useCallback, useMemo, useState, useEffect } from "react";
import MediaCard from "../components/MediaCard";
import { imgUrl } from "../utils/api";
import { EyeIcon, WatchedIcon } from "../components/Icons";
import { useRatings, getRatingForItem } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { storage, STORAGE_KEYS } from "../utils/storage";

const progressKey = (item) =>
  item.media_type === "movie"
    ? `movie_${item.id}`
    : `tv_${item.id}_s${item.season}e${item.episode}`;

// Progress may be stored as 0-1 or 0-100; normalise to a 0-100 percentage.
const toPercent = (p) => {
  const n = Number(p) || 0;
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, pct));
};

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dayBucket = (ts) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  if (diff < 30) return "This month";
  return "Earlier";
};

const formatWhen = (ts, bucket) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  if (bucket === "Today" || bucket === "Yesterday") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
];

export default function LibraryPage({
  history,
  inProgress,
  saved,
  progress,
  onSelect,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  onRemoveHistory,
}) {
  const allItems = useMemo(
    () => [...inProgress, ...saved],
    [inProgress, saved],
  );
  const { ratingsMap, ageLimitSetting } = useRatings(allItems);

  const [sort, setSort] = useState(
    () => storage.get(STORAGE_KEYS.LIBRARY_SORT) || "manual",
  );
  useEffect(() => {
    const handler = (e) => setSort(e.detail);
    window.addEventListener("streambert:library-sort-changed", handler);
    return () =>
      window.removeEventListener("streambert:library-sort-changed", handler);
  }, []);

  const [histFilter, setHistFilter] = useState("all");

  const sortLabels = {
    manual: "Custom order",
    title: "A-Z",
    rating: "Top rated",
    year: "Newest first",
  };

  const getRating = useCallback(
    (item) => getRatingForItem(item, ratingsMap),
    [ratingsMap],
  );
  const itemRestricted = useCallback(
    (item) => isRestricted(getRating(item).minAge, ageLimitSetting),
    [getRating, ageLimitSetting],
  );

  // The most recent in-progress title becomes the "resume" hero,
  // unless it is age-restricted (then it stays a normal card).
  const heroItem =
    inProgress.length > 0 && !itemRestricted(inProgress[0])
      ? inProgress[0]
      : null;
  const restInProgress = heroItem ? inProgress.slice(1) : inProgress;

  const filteredHistory = useMemo(
    () =>
      histFilter === "all"
        ? history
        : history.filter((h) => h.media_type === histFilter),
    [history, histFilter],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filteredHistory.forEach((item) => {
      const label = dayBucket(item.watchedAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(item);
    });
    return [...map.entries()];
  }, [filteredHistory]);

  const summary = [
    inProgress.length > 0 && `${inProgress.length} in progress`,
    saved.length > 0 && `${saved.length} saved`,
    history.length > 0 && `${history.length} watched`,
  ].filter(Boolean);

  const renderCard = (item, withProgress) => {
    const pk = progressKey(item);
    const r = getRating(item);
    return (
      <MediaCard
        key={withProgress ? pk : `${item.media_type}_${item.id}`}
        item={item}
        onClick={() => onSelect(item)}
        {...(withProgress ? { progress: progress[pk] || 0 } : {})}
        watched={watched}
        onMarkWatched={onMarkWatched}
        onMarkUnwatched={onMarkUnwatched}
        ageRating={r.cert}
        restricted={itemRestricted(item)}
      />
    );
  };

  const heroPct = heroItem ? toPercent(progress[progressKey(heroItem)]) : 0;
  const heroTitle = heroItem ? heroItem.title || heroItem.name : "";

  return (
    <div className="fade-in lib-page">
      <header className="lib-header">
        <h1 className="lib-title">Library</h1>
        <p className="lib-sub">
          {summary.length > 0
            ? summary.join(", ")
            : "Everything you watch or save will collect here."}
        </p>
      </header>

      {heroItem && (
        <div
          className="lib-resume"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(heroItem)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSelect(heroItem);
          }}
        >
          {heroItem.poster_path && (
            <div
              className="lib-resume__bg"
              style={{
                backgroundImage: `url(${imgUrl(heroItem.poster_path, "w500")})`,
              }}
            />
          )}
          <div className="lib-resume__poster">
            {heroItem.poster_path && (
              <img src={imgUrl(heroItem.poster_path, "w500")} alt="" />
            )}
          </div>
          <div className="lib-resume__body">
            <div className="lib-resume__kicker">Pick up where you left off</div>
            <div className="lib-resume__title">{heroTitle}</div>
            {heroItem.media_type === "tv" &&
              heroItem.season != null &&
              heroItem.episode != null && (
                <div className="lib-resume__ep">
                  {`Season ${heroItem.season}, episode ${heroItem.episode}`}
                  {heroItem.episodeName ? ` · ${heroItem.episodeName}` : ""}
                </div>
              )}
            {heroPct > 0 && (
              <>
                <div className="lib-resume__bar">
                  <div
                    className="lib-resume__fill"
                    style={{ width: `${heroPct}%` }}
                  />
                </div>
                <div className="lib-resume__left">
                  {`${Math.round(heroPct)}% watched`}
                </div>
              </>
            )}
            <div className="lib-resume__actions">
              <button
                className="lib-play"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(heroItem);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                </svg>
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {restInProgress.length > 0 && (
        <section className="lib-section">
          <div className="lib-section-head">
            <h2 className="lib-section-title">Continue watching</h2>
          </div>
          <div className="cards-grid">
            {restInProgress.map((item) => renderCard(item, true))}
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section className="lib-section">
          <div className="lib-section-head">
            <h2 className="lib-section-title">Watchlist</h2>
            <span className="lib-count">{saved.length}</span>
            {sort !== "manual" && (
              <span className="lib-chip">{sortLabels[sort]}</span>
            )}
          </div>
          <div className="cards-grid">
            {saved.map((item) => renderCard(item, false))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="lib-section">
          <div className="lib-section-head">
            <h2 className="lib-section-title">Watch history</h2>
            <div className="lib-seg" role="group" aria-label="Filter history">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  aria-pressed={histFilter === f.id}
                  onClick={() => setHistFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {groups.length === 0 && (
            <div className="lib-none">Nothing in this filter yet.</div>
          )}

          <div className="lib-history">
            {groups.map(([label, items]) => (
              <div className="lib-day" key={label}>
                <h3 className="lib-day__label">{label}</h3>
                <div className="lib-day__items">
                  {items.map((item) => {
                    const pk = progressKey(item);
                    const isWatched = !!watched?.[pk];
                    const isTv = item.media_type === "tv";
                    return (
                      <div
                        key={`${pk}_${item.watchedAt}`}
                        className="lib-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSelect(item);
                        }}
                      >
                        <div className="lib-row__thumb">
                          {item.poster_path && (
                            <img
                              src={imgUrl(item.poster_path, "w92")}
                              alt=""
                            />
                          )}
                        </div>
                        <div className="lib-row__body">
                          <div className="lib-row__title">
                            {item.title || item.name}
                            {isWatched && <WatchedIcon size={16} />}
                          </div>
                          <div className="lib-row__meta">
                            {isTv &&
                              item.season != null &&
                              item.episode != null && (
                                <>
                                  {`S${item.season}E${item.episode}`}
                                  {item.episodeName
                                    ? ` · ${item.episodeName}`
                                    : ""}
                                  {" · "}
                                </>
                              )}
                            {formatWhen(item.watchedAt, label)}
                          </div>
                        </div>
                        <span
                          className={`lib-pill ${isTv ? "lib-pill--tv" : "lib-pill--movie"}`}
                        >
                          {isTv ? "Series" : "Movie"}
                        </span>
                        {onRemoveHistory && (
                          <button
                            className="lib-row__remove"
                            title="Remove from history"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveHistory(item);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {history.length === 0 && saved.length === 0 && !heroItem && (
        <div className="empty-state">
          <EyeIcon />
          <h3>Nothing here yet</h3>
          <p>
            Start watching a movie or series and your history will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

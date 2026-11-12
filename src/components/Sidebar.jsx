import { useState, useRef, useEffect } from "react";
import { imgUrl } from "../utils/api";
import { useSeasonalEvent } from "../components/seasonalEvents.jsx";
import {
  StreambertLogo,
  HomeIcon,
  SearchIcon,
  HistoryIcon,
  FilmIcon,
  SettingsIcon,
  DownloadsQueueIcon,
  QuitIcon,
  BackIcon,
  HelpIcon,
} from "./Icons";

export default function Sidebar({
  page,
  platform,
  onNavigate,
  onSearch,
  savedList,
  activeDownloads,
  onReorderSaved,
  onRemoveSaved,
  canGoBack,
  onBack,
  onShowShortcuts,
}) {
  const [dragOver, setDragOver] = useState(null);
  const dragItem = useRef(null);
  const dragNode = useRef(null);
  const seasonalEvent = useSeasonalEvent();
  const searchShortcutLabel =
    platform === "darwin"
      ? "⌘F"
      : platform === "win32"
        ? "Ctrl+K"
        : "Ctrl+F";

  // Tulisan merek: tampil di paling atas halaman, hilang saat di-scroll ke bawah
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const main = document.querySelector(".main");
    setAtTop(!main || main.scrollTop < 40);
  }, [page]);
  useEffect(() => {
    const onScroll = (e) => {
      const el = e.target;
      if (!el || !el.classList || !el.classList.contains("main")) return;
      setAtTop(el.scrollTop < 40);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const [tooltip, setTooltip] = useState(null); // { title, x, y }
  const [contextMenu, setContextMenu] = useState(null); // { item, x, y }

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, []);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    dragNode.current = e.currentTarget;
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    dragItem.current = null;
    dragNode.current = null;
    setDragOver(null);
  };

  const handleDragEnter = (e, index) => {
    if (dragItem.current === index) return;
    setDragOver(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const fromIndex = dragItem.current;
    if (fromIndex === null || fromIndex === dropIndex) return;

    const newList = [...savedList];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(dropIndex, 0, moved);

    const newOrder = newList.map((item) => `${item.media_type}_${item.id}`);
    onReorderSaved(newOrder);
    setDragOver(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleMouseEnter = (e, title) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ title, x: rect.left + rect.width / 2, y: rect.bottom });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className={"sidebar" + (atTop ? "" : " is-scrolled")}>
      <div
        className="sidebar-logo"
        onClick={() => onNavigate("home")}
        title="Lumora"
        style={{ position: "relative" }}
      >
        <StreambertLogo />
        {seasonalEvent && seasonalEvent.render()}
      </div>
      <span className="brand-wordmark" onClick={() => onNavigate("home")}>
        Lumora
      </span>

      <nav className="nav-main">
        {canGoBack && (
          <SideBtn onClick={onBack} icon={<BackIcon />} label="Back (Ctrl+Z)" />
        )}
        <SideBtn
          active={page === "home"}
          onClick={() => onNavigate("home")}
          icon={<HomeIcon />}
          label="Home"
          short="Home"
        />
        <SideBtn
          active={page === "history"}
          onClick={() => onNavigate("history")}
          icon={<HistoryIcon />}
          label="Library & History"
          short="Library"
        />
        <SideBtn
          active={page === "downloads"}
          onClick={() => onNavigate("downloads")}
          icon={<DownloadsQueueIcon />}
          label="Downloads"
          short="Downloads"
          badge={activeDownloads > 0 ? activeDownloads : null}
        />
      </nav>

      <div className="sidebar-sep" />

      <div className="sidebar-saved">
        {savedList.map((item, index) => {
          const key = `${item.media_type}_${item.id}`;
          const title = item.title || item.name;
          return (
            <div
              key={key}
              className={`saved-thumb${dragOver === index ? " drag-over" : ""}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() =>
                onNavigate(item.media_type === "tv" ? "tv" : "movie", item)
              }
              onContextMenu={(e) => handleContextMenu(e, item)}
              onMouseEnter={(e) => handleMouseEnter(e, title)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: "grab", position: "relative" }}
            >
              {item.poster_path ? (
                <img src={imgUrl(item.poster_path, "w200")} alt={title} />
              ) : (
                <div className="no-img">
                  <FilmIcon />
                </div>
              )}
              {dragOver === index && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "var(--accent, #e50914)",
                    borderRadius: 2,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div
          className="saved-thumb-tooltip"
          style={{ left: tooltip.x, top: tooltip.y + 10 }}
        >
          {tooltip.title}
        </div>
      )}

      {contextMenu && (
        <div
          className="sidebar-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="sidebar-context-menu-item"
            onClick={() => {
              onRemoveSaved && onRemoveSaved(contextMenu.item);
              setContextMenu(null);
            }}
          >
            Remove
          </div>
        </div>
      )}

      <div className="sidebar-bottom">
        <button
          className="nav-search"
          onClick={onSearch}
          title={`Search (${searchShortcutLabel})`}
        >
          <SearchIcon />
          <span>Search</span>
          <kbd>{searchShortcutLabel}</kbd>
        </button>
        <SideBtn
          onClick={onShowShortcuts}
          icon={<HelpIcon />}
          label="Help & Shortcuts (?)"
        />
        <SideBtn
          active={page === "settings"}
          onClick={() => onNavigate("settings")}
          icon={<SettingsIcon />}
          label="Settings"
        />
        <button
          className="sidebar-btn sidebar-btn--quit"
          onClick={() => window.electron?.quitApp?.()}
          title="Quit App"
        >
          <QuitIcon />
          <span className="tooltip">Quit App</span>
        </button>
      </div>
    </div>
  );
}

function SideBtn({ active, onClick, icon, label, badge, short }) {
  return (
    <button
      className={`sidebar-btn${active ? " active" : ""}${short ? " has-label" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      {icon}
      {short && <span className="sb-label">{short}</span>}
      <span className="tooltip">{label}</span>
      {badge && <span className="sb-badge">{badge}</span>}
    </button>
  );
}

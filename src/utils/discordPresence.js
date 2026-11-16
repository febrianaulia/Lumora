
// ── Lumora Discord Rich Presence ──────────────────────────────────────────
// Builds activity payload and forwards it to the Electron main process.

import { storage, STORAGE_KEYS, isElectron } from "./storage";

// Lumora branding
const APP_ICON_URL =
  "https://raw.githubusercontent.com/febrianaulia/Lumora/main/public/icon.png";

const GITHUB_URL = "https://github.com/febrianaulia/Lumora";

export function readDiscordRpcSettings() {
  return {
    enabled: !!storage.get(STORAGE_KEYS.DISCORD_RPC_ENABLED),
    showCover: storage.get(STORAGE_KEYS.DISCORD_RPC_SHOW_COVER) !== false,
    showTimestamp:
      storage.get(STORAGE_KEYS.DISCORD_RPC_SHOW_TIMESTAMP) !== false,
    showButton: storage.get(STORAGE_KEYS.DISCORD_RPC_SHOW_BUTTON) !== false,
  };
}

/** Push enabled/disabled state to the main process. */
export function applyDiscordRpcEnabled(enabled) {
  if (!isElectron || !window.electron?.discordRpcSetEnabled) return;
  window.electron.discordRpcSetEnabled(!!enabled);
}

function baseAssets(posterUrl, settings) {
  const assets = {};

  if (settings.showCover && posterUrl) {
    assets.large_image = posterUrl;
    assets.small_image = APP_ICON_URL;
    assets.small_text = "Lumora";
  } else {
    assets.large_image = APP_ICON_URL;
  }

  return assets;
}

function buttons(settings) {
  return settings.showButton
    ? [{ label: "Open Lumora", url: GITHUB_URL }]
    : undefined;
}

/**
 * info.title      - movie/show title
 * info.subtitle   - e.g. "Film" or "S2 · E5"
 * info.posterUrl  - full HTTPS poster URL or null
 * info.startedAt  - timestamp in milliseconds
 */
export function sendWatchingActivity(info, settings) {
  if (!isElectron || !window.electron?.discordRpcUpdateActivity) return;
  if (!settings.enabled) return;

  const activity = {
    type: 3,
    details: info.title?.slice(0, 128) || "Watching Lumora",
    state: (info.subtitle || "Lumora").slice(0, 128),
    assets: {
      ...baseAssets(info.posterUrl, settings),
      large_text: info.title?.slice(0, 128) || "Lumora",
    },
  };

  if (settings.showTimestamp && info.startedAt) {
    activity.timestamps = { start: info.startedAt };
  }

  const btns = buttons(settings);
  if (btns) activity.buttons = btns;

  window.electron.discordRpcUpdateActivity(activity);
}

export function sendIdleActivity(settings) {
  if (!isElectron || !window.electron?.discordRpcUpdateActivity) return;
  if (!settings.enabled) return;

  const activity = {
    type: 3,
    details: "Idling",
    state: "Lumora",
    assets: {
      large_image: APP_ICON_URL,
      large_text: "Lumora",
    },
  };

  const btns = buttons(settings);
  if (btns) activity.buttons = btns;

  window.electron.discordRpcUpdateActivity(activity);
}

export function clearActivity() {
  if (!isElectron || !window.electron?.discordRpcUpdateActivity) return;
  window.electron.discordRpcUpdateActivity(null);
}

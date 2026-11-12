
const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  webContents,
  Notification,
} = require("electron");
const path = require("path");

// -- Lumora main process entry point ---------------------------------------
// Responsible for: window creation, session setup, ad-blocking, scheduled
// backup trigger, and app lifecycle. All heavy IPC logic lives in src/ipc/.

/* -- RAM / performance flags ------------------------------------------------ */
if (process.env.LUMORA_LOW_RAM === undefined) {
  process.env.LUMORA_LOW_RAM = "1";
}
if (process.env.LUMORA_LOW_RAM === "1") {
  app.commandLine.appendSwitch(
    "js-flags",
    "--max-old-space-size=256 --expose-gc",
  );
  console.log("LUMORA_LOW_RAM mode on");
  app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess2");
  app.commandLine.appendSwitch("disk-cache-size", String(80 * 1024 * 1024));
  app.commandLine.appendSwitch("renderer-process-limit", "3");
} else {
  console.log("LUMORA_LOW_RAM mode off");
}

const _t0 = Date.now();
const _bench = (label) =>
  console.log(`[boot] ${label}: +${Date.now() - _t0}ms`);

const blockStats = require("./src/ipc/blockStats");
const siteTweaks = require("./src/ipc/siteTweaks");
const storageIpc = require("./src/ipc/storage");
const downloadsIpc = require("./src/ipc/downloads");
const subtitlesIpc = require("./src/ipc/subtitles");
const hianimeIpc = require("./src/ipc/hianime");
const playerIpc = require("./src/ipc/player");
const discordRpc = require("./src/ipc/discordRpc");

const BLOCKED_HOSTS = [
  "*://www.google-analytics.com/*",
  "*://analytics.google.com/*",
  "*://googletagmanager.com/*",
  "*://www.googletagmanager.com/*",
  "*://googletagservices.com/*",
  "*://doubleclick.net/*",
  "*://*.doubleclick.net/*",
  "*://adservice.google.com/*",
  "*://adservice.google.de/*",
  "*://pagead2.googlesyndication.com/*",
  "*://stats.g.doubleclick.net/*",
  "*://yt3.ggpht.com/ytc/*",
  "*://fonts.googleapis.com/*",
  "*://fonts.gstatic.com/*",
  "*://googleapis.com/*",
  "*://gstatic.com/*",
  "*://cdn.adx1.com/*",
  "*://intelligenceadx.com/*",
  "*://adsco.re/*",
  "*://mc.yandex.com/*",
  "*://mc.yandex.ru/*",
  "*://bvtpk.com/*",
  "*://my.rtmark.net/*",
  "*://b7510.com/*",
  "*://gt.unbrownunflat.com/*",
  "*://im.malocacomals.com/*",
  "*://users.videasy.net/*",
  "*://nf.sixmossin.com/*",
  "*://realizationnewestfangs.com/*",
  "*://acscdn.com/*",
  "*://lt.taloseempest.com/*",
  "*://pl26708123.profitableratecpm.com/*",
  "*://preferencenail.com/*",
  "*://protrafficinspector.com/*",
  "*://s10.histats.com/*",
  "*://weirdopt.com/*",
  "*://cloudflareinsights.com/*",
  "*://*.cloudflareinsights.com/*",
  "*://kettledroopingcontinuation.com/*",
  "*://wayfarerorthodox.com/*",
  "*://woxaglasuy.net/*",
  "*://adeptspiritual.com/*",
  "*://www.calculating-laugh.com/*",
  "*://amavhxdlofklxjg.xyz/*",
  "*://7jtjubf8p5kq7x3z2.u3qleufcm6vure326ktfpbj.cfd/*",
  "*://5mq.get64t9vqg8pnbex1y463o.rest/*",
  "*://usrpubtrk.com/*",
  "*://adexchangeclear.com/*",
  "*://rzjzjnavztycv.online/*",
  "*://tmstr4.cloudnestra.com/*",
  "*://tmstr4.neonhorizonworkshops.com/*",
  "*://hameltnoummos.com/*",
  "*://ancillammmm.com/*",
  "*://*.ancillammmm.com/*",
  "*://hubeamily.com/*",
  "*://*.hubeamily.com/*",
  "*://llvpn.com/*",
  "*://americanacademyofthermology.org/*",
  "*://d2pf0ys5xus6n.cloudfront.net/*",
  "*://gillyspencie.com/*",
  "*://soakysecrets.com/*",
  "*://*.soakysecrets.com/*",
  "*://mdstats.info/*",
  "*://ads-twitter.com/*",
  "*://*.ads-twitter.com/*",
  "*://connatix.com/*",
  "*://*.connatix.com/*",
  "*://imasdk.googleapis.com/*",
  "*://jwpltx.com/*",
  "*://*.jwpltx.com/*",
  "*://improving.duckduckgo.com/*",
  "*://openfpcdn.io/*",
  "*://phruk.org/*",
  "*://welcomingexpulsion.com/*",
  "*://pgo99.com/*",
  "*://todditehexarch.com/*",
  "*://*.todditehexarch.com/*",
  "*://uniolaicecaps.com/*",
  "*://*.uniolaicecaps.com/*",
  "*://alloha.tv/*",
  "*://*.alloha.tv/*",
  "*://pc.alloviewroll.com/*",
  "*://yadro.ru/*",
  "*://*.yadro.ru/*",
  "*://getaim.org/*",
  "*://*.getaim.org/*",
  "*://myangular.life/*",
  "*://*.myangular.life/*",
  "*://rstprgapipt.com/*",
  "*://*.rstprgapipt.com/*",
  "*://veselchaga.link/*",
  "*://webvisor.org/*",
  "*://*.webvisor.org/*",
  "*://datariaarpent.com/*",
  "*://*.datariaarpent.com/*",
  "*://gamesrevenue.com/*",
  "*://*.gamesrevenue.com/*",
  "*://73ed366d3137ec936bd60b1184467776.com/*",
  "*://shankedunwindy.cyou/*",
  "*://*.shankedunwindy.cyou/*",
  "*://908df012d9bb72e6d26b41054588d758.com/*",
  "*://asemquips.cfd/*",
  "*://*.asemquips.cfd/*",
  "*://epicgameshubham.com/*",
  "*://tantrajoni.cfd/*",
  "*://thatdisform.cyou/*",
  "*://vdrk.site/*",
  "*://*.vdrk.site/*",
  "*://*.adsco.re/*",
  "*://aarems.org/*",
  "*://*.aarems.org/*",
  "*://aerionvel.com/*",
  "*://*.aerionvel.com/*",
  "*://cdn4ads.com/*",
  "*://*.cdn4ads.com/*",
  "*://directyp.org/*",
  "*://*.directyp.org/*",
  "*://fakerstoterframing.qpon/*",
  "*://*.fakerstoterframing.qpon/*",
  "*://karthliunstagy.com/*",
  "*://*.karthliunstagy.com/*",
  "*://nresystems.com/*",
  "*://*.nresystems.com/*",
  "*://sainwertapr.com/*",
  "*://*.sainwertapr.com/*",
  "*://*.tantrajoni.cfd/*",
  "*://*.thatdisform.cyou/*",
  "*://pxltag.com/*",
  "*://*.pxltag.com/*",
  "*://runative-syndicate.com/*",
  "*://*.runative-syndicate.com/*",
  "*://saidairakas.com/*",
  "*://*.saidairakas.com/*",
  "*://coiffesreal.qpon/*",
  "*://*.coiffesreal.qpon/*",
  "*://solarcyclonesky.com/*",
  "*://*.solarcyclonesky.com/*",
  "*://bawrelcuttail.com/*",
  "*://*.bawrelcuttail.com/*",
  "*://tabaxirethnize.cyou/*",
  "*://*.tabaxirethnize.cyou/*",
  "*://thyriswh.cyou/*",
  "*://*.thyriswh.cyou/*",
  "*://ukankingwithea.com/*",
  "*://*.ukankingwithea.com/*",
  "*://uuidksinc.net/*",
  "*://*.uuidksinc.net/*",
  "*://blockadsnot.com/*",
  "*://*.blockadsnot.com/*",
  "*://canseealltheugline.org/*",
  "*://*.canseealltheugline.org/*",
  "*://eifitcannotke.org/*",
  "*://*.eifitcannotke.org/*",
  "*://embercascademaple.com/*",
  "*://*.embercascademaple.com/*",
  "*://bancadeltempoidea.org/*",
  "*://*.bancadeltempoidea.org/*",
  "*://1158060716.rsc.cdn77.org/*",
  "*://facebook.com/*",
  "*://tryedesign.com/*",
  "*://*.tryedesign.com/*",
  "*://ahacdn.me/*",
  "*://*.ahacdn.me/*",
  "*://autorepairworcester.com/*",
  "*://aelwynvel.com/*",
  "*://*.aelwynvel.com/*",
  "*://cometslourdy.cfd/*",
  "*://*.cometslourdy.cfd/*",
  "*://pusleybrand.cyou/*",
  "*://*.pusleybrand.cyou/*",
  "*://luugy.com/*",
  "*://*.luugy.com/*",
  "*://nimbusgrovelodge.com/*",
  "*://*.nimbusgrovelodge.com/*",
  "*://brushetenglandagacant.qpon/*",
  "*://*.brushetenglandagacant.qpon/*",
  "*://hyaloidsatury.com/*",
  "*://*.hyaloidsatury.com/*",
  "*://*.google-analytics.com/*",
  "*://stummelbeelbow.com/*",
  "*://*.stummelbeelbow.com/*",
  "*://mgid.com/*",
  "*://*.mgid.com/*",
  "*://deedwaifpleas.org/*",
  "*://*.deedwaifpleas.org/*",
  "*://pushaffiliate.net/*",
  "*://*.pushaffiliate.net/*",
  "*://imp-mintads.site/*",
  "*://*.imp-mintads.site/*",
  "*://oceanicdreamcove.com/*",
  "*://*.oceanicdreamcove.com/*",
  "*://xadsmart.com/*",
  "*://*.xadsmart.com/*",
  "*://srvqk3.com/*",
  "*://*.srvqk3.com/*",
  "*://1376341044.rsc.cdn77.org/*",
  "*://adright.xml-v4.ak-is2.net/*",
  "*://csp-reporting.cloudflare.com/*",
  "*://*.facebook.com/*",
  "*://cysyjucymudity.com/*",
  "*://*.cysyjucymudity.com/*",
  "*://pncloudfl.com/*",
  "*://*.pncloudfl.com/*",
  "*://cruzswim.org/*",
  "*://*.cruzswim.org/*",
  "*://darnobedienceupscale.com/*",
  "*://*.darnobedienceupscale.com/*",
  "*://derricknationtop.com/*",
  "*://*.derricknationtop.com/*",
  "*://e89d45b16370ee7e43daeaf6ce8d9547.com/*",
  "*://*.e89d45b16370ee7e43daeaf6ce8d9547.com/*",
  "*://tsyndicate.com/*",
  "*://*.tsyndicate.com/*",
  "*://rapidadexchange.com/*",
  "*://*.rapidadexchange.com/*",
  "*://cepesbritons.qpon/*",
  "*://*.cepesbritons.qpon/*",
  "*://sarplerlacunes.qpon/*",
  "*://*.sarplerlacunes.qpon/*",
  "*://usrpubtrck.com/*",
  "*://*.usrpubtrck.com/*",
  "*://ixiondartman.com/*",
  "*://*.ixiondartman.com/*",
  "*://varnishtala.cyou/*",
  "*://*.varnishtala.cyou/*",
  "*://1037973644.rsc.cdn77.org/*",
  "*://cdn.pncloudfl.com.cdn.cloudflare.net/*",
];

let mainWindow = null;
const getMainWindow = () => mainWindow;

const playerWcIds = new Set();
let sessionsConfigured = false;

function buildCleanUserAgent() {
  return app.userAgentFallback
    .replace(/\s?Electron\/\S+/i, "")
    .replace(/\s?lumora\/\S+/i, "")
    .trim();
}

ipcMain.on("get-clean-user-agent", (event) => {
  event.returnValue = buildCleanUserAgent();
});

const POPUP_STUB_HOSTS = ["vidrift.net", "vidrift.in"];

function urlMatchesHosts(url, hosts) {
  try {
    const host = new URL(url).hostname;
    return hosts.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

function installPopupHandler(wc) {
  wc.setWindowOpenHandler(() => {
    if (!urlMatchesHosts(wc.getURL(), POPUP_STUB_HOSTS)) {
      return { action: "deny" };
    }
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        show: false,
        width: 1,
        height: 1,
        skipTaskbar: true,
        webPreferences: { backgroundThrottling: true },
      },
    };
  });
  wc.on("did-create-window", (win) => {
    try {
      win.webContents.setAudioMuted(true);
      win.webContents.stop();
      setTimeout(() => {
        if (!win.isDestroyed()) win.destroy();
      }, 5000);
    } catch {}
  });
}

function setYoutubeConsentCookies(sess) {
  const ytCookie = {
    url: "https://www.youtube.com",
    name: "SOCS",
    value: "CAI",
    path: "/",
    secure: true,
    httpOnly: false,
    sameSite: "no_restriction",
    expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2,
  };
  for (const domain of [".youtube.com", ".youtube-nocookie.com"]) {
    sess.cookies.set({ ...ytCookie, domain }).catch(() => {});
  }
}

function setupSession(playerSession, trailerSession) {
  const stripHeaders = (details, callback) => {
    const headers = { ...details.responseHeaders };
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (lower === "x-frame-options" || lower === "content-security-policy")
        delete headers[key];
    }
    callback({ responseHeaders: headers });
  };

  const UA = buildCleanUserAgent();

  const blockDownloads = (event) => event.preventDefault();
  playerSession.on("will-download", blockDownloads);
  trailerSession.on("will-download", blockDownloads);

  playerSession.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    stripHeaders,
  );
  trailerSession.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    stripHeaders,
  );

  trailerSession.webRequest.onBeforeRequest({ urls: BLOCKED_HOSTS }, (_, cb) =>
    cb({ cancel: true }),
  );

  const MEDIA_URLS = [
    "*://*/*.m3u8*",
    "*://*/*.m3u8",
    "*://*/*.vtt*",
    "*://*/*.vtt",
  ];
  playerSession.webRequest.onBeforeRequest(
    { urls: [...BLOCKED_HOSTS, ...MEDIA_URLS] },
    (details, callback) => {
      const { url } = details;
      const isMedia = url.includes(".m3u8") || url.includes(".vtt");
      if (!isMedia) {
        blockStats.recordBlockedRequest(url);
        callback({ cancel: true });
        return;
      }
      try {
        const host = new URL(url).hostname;
        const blocked = BLOCKED_HOSTS.some((pat) => {
          const hostPat = pat.replace(/^\*:\/\//, "").split("/")[0];
          return hostPat.startsWith("*.")
            ? host.endsWith(hostPat.slice(1))
            : host === hostPat || host === hostPat.replace(/^\*\./, "");
        });
        if (blocked) {
          blockStats.recordBlockedRequest(url);
          callback({ cancel: true });
          return;
        }
      } catch {}
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        if (url.includes(".m3u8")) {
          mw.webContents.send("m3u8-found", url);
        } else if (url.includes(".vtt")) {
          const { extractSubtitleLang } = require("./src/ipc/subtitles");
          mw.webContents.send("subtitle-found", {
            url,
            lang: extractSubtitleLang(url),
          });
        }
      }
      callback({});
    },
  );

  playerSession.webRequest.onBeforeSendHeaders(
    { urls: ["*://*/*.m3u8*", "*://*/*.m3u8"] },
    (details, callback) => {
      callback({ requestHeaders: details.requestHeaders });
      try {
        if (playerIpc.hasStreamMeta(details.url)) return;
        const h = details.requestHeaders || {};
        const get = (n) =>
          h[Object.keys(h).find((k) => k.toLowerCase() === n) || ""] || "";
        let pageUrl = "";
        try {
          pageUrl = details.frame?.url || details.webContents?.getURL() || "";
        } catch {}
        const pageOrigin = /^https?:/.test(pageUrl)
          ? new URL(pageUrl).origin
          : "";
        const meta = {
          referer: get("referer") || details.referrer || pageUrl,
          origin: get("origin") || pageOrigin,
          userAgent: get("user-agent"),
        };
        playerIpc.rememberStreamMeta(details.url, meta);
      } catch {}
    },
  );

  setYoutubeConsentCookies(trailerSession);
}

function createWindow() {
  storageIpc.applySecretMigrationIfNeeded();
  downloadsIpc.loadDownloads();
  blockStats.loadBlockStats();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0a0a",
    icon:
      process.platform === "linux"
        ? path.join(__dirname, "public/sized/256x256.png")
        : undefined,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 12, y: 12 },
    frame: process.platform !== "win32",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      backgroundThrottling: true,
      spellcheck: false,
      additionalArguments:
        process.env.LUMORA_LOW_RAM === "1"
          ? ["--js-flags=--max-old-space-size=256 --expose-gc"]
          : [],
    },
  });

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["*://image.tmdb.org/*"] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      headers["cache-control"] = ["public, max-age=604800, immutable"];
      delete headers["pragma"];
      delete headers["expires"];
      callback({ responseHeaders: headers });
    },
  );

  mainWindow.webContents.on("will-attach-webview", () => {
    if (sessionsConfigured) return;
    sessionsConfigured = true;
    setupSession(
      session.fromPartition("persist:player"),
      session.fromPartition("persist:trailer"),
    );
  });

  mainWindow.webContents.on("did-attach-webview", (_, wc) => {
    if (!sessionsConfigured) {
      sessionsConfigured = true;
      const playerSession = session.fromPartition("persist:player");
      const trailerSession = session.fromPartition("persist:trailer");
      setupSession(playerSession, trailerSession);
    }

    try {
      if (wc.session === session.fromPartition("persist:player")) {
        playerWcIds.add(wc.id);
        wc.once("destroyed", () => playerWcIds.delete(wc.id));
        siteTweaks.attach(wc);
      }
    } catch {}

    installPopupHandler(wc);
    wc.on("enter-html-full-screen", () =>
      mainWindow.webContents.send("webview-enter-fullscreen"),
    );
    wc.on("leave-html-full-screen", () =>
      mainWindow.webContents.send("webview-leave-fullscreen"),
    );
  });

  mainWindow.loadFile(path.join(__dirname, "dist/index.html"));

  mainWindow.webContents.once("did-finish-load", () => {
    _bench("renderer loaded");
    const sbSettings = storageIpc.loadScheduledBackupSettings();
    if (storageIpc.shouldRunScheduledBackup(sbSettings)) {
      mainWindow.webContents.send("scheduled-backup-requested");
    }
  });

  let closeResponsePending = false;
  mainWindow.on("close", (e) => {
    const running = downloadsIpc
      .getDownloads()
      .filter((d) => d.status === "downloading");
    if (running.length === 0) return;
    e.preventDefault();
    if (closeResponsePending) return;
    closeResponsePending = true;
    mainWindow.webContents.send("confirm-close", { count: running.length });
  });

  ipcMain.on("close-response", (_, confirmed) => {
    closeResponsePending = false;
    if (confirmed) {
      downloadsIpc.killAllDownloads();
      mainWindow.destroy();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });
}

storageIpc.register();
downloadsIpc.register(getMainWindow);
subtitlesIpc.register({
  getDownloads: downloadsIpc.getDownloads,
  saveDownloads: downloadsIpc.saveDownloads,
});
hianimeIpc.register();
playerIpc.register(getMainWindow, {
  writeSecretMigration: storageIpc.writeSecretMigration,
});
blockStats.init(getMainWindow);
discordRpc.register(ipcMain);

ipcMain.handle("get-block-stats", () => blockStats.getBlockStats());

ipcMain.on("player-stopped", () => {
  for (const id of playerWcIds) {
    try {
      const wc = webContents.fromId(id);
      if (wc && !wc.isDestroyed()) {
        try {
          wc.setAudioMuted(true);
        } catch {}
      }
    } catch {}
  }
  playerWcIds.clear();

  if (typeof global.gc === "function") global.gc();
  const mw = mainWindow;
  if (mw && !mw.isDestroyed()) {
    mw.webContents
      .executeJavaScript("if(typeof gc==='function') gc();")
      .catch(() => {});
  }
});

ipcMain.handle(
  "show-notification",
  (_event, { title, body, silent = false }) => {
    try {
      if (!Notification.isSupported()) return;
      const n = new Notification({
        title: String(title),
        body: String(body),
        silent,
      });
      n.show();
    } catch {}
  },
);

let pipWindow = null;
let pipUaCustom = false;
const getPipWindow = () => pipWindow;

ipcMain.handle("open-pip-window", (_, { url, title, userAgent }) => {
  if (!url || url === "about:blank") return { ok: false, reason: "no-url" };

  if (!sessionsConfigured) {
    sessionsConfigured = true;
    const playerSession = session.fromPartition("persist:player");
    const trailerSession = session.fromPartition("persist:trailer");
    setupSession(playerSession, trailerSession);
  }

  const loadOpts = {};
  if (typeof userAgent === "string" && userAgent) {
    loadOpts.userAgent = userAgent;
  }

  if (pipWindow && !pipWindow.isDestroyed()) {
    if (pipUaCustom && !loadOpts.userAgent) {
      pipWindow.webContents.setUserAgent(app.userAgentFallback);
    }
    pipUaCustom = !!loadOpts.userAgent;
    pipWindow.loadURL(url, loadOpts);
    pipWindow.focus();
    return { ok: true };
  }

  pipWindow = new BrowserWindow({
    width: 640,
    height: 360,
    minWidth: 320,
    minHeight: 180,
    alwaysOnTop: true,
    title: title ? `${title} - Pop-out` : "Pop-out Player",
    backgroundColor: "#000000",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform !== "win32",
    webPreferences: {
      partition: "persist:player",
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "popout-preload.js"),
    },
  });

  installPopupHandler(pipWindow.webContents);
  siteTweaks.attach(pipWindow.webContents);

  pipWindow.webContents.on("did-attach-webview", (_, wc) => {
    wc.setWindowOpenHandler(() => ({ action: "deny" }));
  });

  pipUaCustom = !!loadOpts.userAgent;
  pipWindow.loadURL(url, loadOpts);

  pipWindow.on("maximize", () => {
    if (!pipWindow.isDestroyed())
      pipWindow.webContents.send("popout-window-maximized", true);
  });
  pipWindow.on("unmaximize", () => {
    if (!pipWindow.isDestroyed())
      pipWindow.webContents.send("popout-window-maximized", false);
  });

  const notifyMain = (channel) => {
    const mw = getMainWindow();
    if (mw && !mw.isDestroyed()) mw.webContents.send(channel);
  };

  pipWindow.on("closed", () => {
    pipWindow = null;
    notifyMain("pip-window-closed");
  });

  notifyMain("pip-window-opened");
  return { ok: true };
});

ipcMain.handle("close-pip-window", () => {
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.close();
});

ipcMain.handle("get-pip-webcontents-id", () => {
  if (pipWindow && !pipWindow.isDestroyed()) return pipWindow.webContents.id;
  return null;
});

ipcMain.handle("popout-window-minimize", () => {
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.minimize();
});
ipcMain.handle("popout-window-toggle-maximize", () => {
  if (!pipWindow || pipWindow.isDestroyed()) return;
  if (pipWindow.isMaximized()) pipWindow.unmaximize();
  else pipWindow.maximize();
});
ipcMain.handle("popout-window-close", () => {
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.close();
});
ipcMain.handle("popout-window-is-maximized", () => {
  return pipWindow && !pipWindow.isDestroyed()
    ? pipWindow.isMaximized()
    : false;
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    _bench("app ready");
    createWindow();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => discordRpc.shutdown());
  app.on("activate", () => {
    if (mainWindow === null) createWindow();
  });
}

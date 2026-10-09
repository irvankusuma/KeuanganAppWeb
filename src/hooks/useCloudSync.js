import { useEffect, useState } from "react";
import * as Cloud from "../services/CloudSyncService";

const DEBOUNCE_MS = 3000;
const INTERVAL_MS = 5 * 60 * 1000;
const PULL_INTERVAL_MS = 60 * 1000;
const PULL_THROTTLE_MS = 15 * 1000;
const LAST_CHANGE_KEY = "kua:lastChangeMs";
const LAST_APPLIED_KEY = "kua:lastAppliedCloudMs";


let engine = null;

function createEngine() {
  const state = { user: null, syncing: false, lastPushMs: Cloud.getLastPushMs() };
  const listeners = new Set();
  let timer = null;
  let busy = false;
  let applying = false;
  let lastPullMs = 0;

  const emit = () => listeners.forEach((fn) => fn({ ...state }));

  const push = async () => {
    if (!Cloud.isFirebaseConfigured || !state.user || busy) return;
    busy = true;
    state.syncing = true;
    emit();
    try {
      state.lastPushMs = await Cloud.pushToCloud();
    } catch (err) {
      console.error("Auto-sync gagal:", err);
    } finally {
      busy = false;
      state.syncing = false;
      emit();
    }
  };

  const schedulePush = () => {
    if (!state.user || applying) return;
    clearTimeout(timer);
    timer = setTimeout(push, DEBOUNCE_MS);
  };

  const hasPendingChanges = () =>
    Number(localStorage.getItem(LAST_CHANGE_KEY) || 0) > state.lastPushMs;

  const pushIfDirty = () => {
    if (hasPendingChanges()) return push();
    return Promise.resolve();
  };

  const pullIfNewer = async () => {
    if (!Cloud.isFirebaseConfigured || !state.user || busy || applying) return;
    const now = Date.now();
    if (now - lastPullMs < PULL_THROTTLE_MS) return;
    lastPullMs = now;
    try {
      const cloud = await Cloud.fetchCloud();
      const remoteMs = Number(cloud?.updatedAtMs) || 0;
      if (!cloud?.data || !remoteMs) return;

      const localChangeMs = Number(localStorage.getItem(LAST_CHANGE_KEY) || 0);
      const appliedMs = Number(localStorage.getItem(LAST_APPLIED_KEY) || 0);

      // Perubahan lokal belum sempat terkirim -> kirim dulu, jangan ditimpa.
      if (localChangeMs > remoteMs) {
        await push();
        return;
      }
      // Snapshot cloud berasal dari push perangkat ini, atau sudah pernah diterapkan.
      if (remoteMs <= state.lastPushMs || remoteMs <= appliedMs) return;

      applying = true;
      await Cloud.restoreFromCloud();
      state.lastPushMs = remoteMs;
      window.location.reload();
    } catch (err) {
      console.error("Auto-pull gagal:", err);
    } finally {
      applying = false;
    }
  };

  if (Cloud.isFirebaseConfigured) {
    Cloud.onAuthChange(async (u) => {
      state.user = u;
      emit();
      if (!u) return;
      const flag = `kua:autoRestored:${u.uid}`;
      if (Cloud.countRows(Cloud.collectLocal()) === 0 && !localStorage.getItem(flag)) {
        try {
          const cloud = await Cloud.restoreFromCloud();
          localStorage.setItem(flag, "1");
          if (cloud && Cloud.countRows(cloud.data) > 0) window.location.reload();
        } catch (err) {
          console.error("Auto-restore gagal:", err);
        }
        return;
      }
      pullIfNewer();
    });

    window.addEventListener("kua:data-changed", () => {
      if (!applying) localStorage.setItem(LAST_CHANGE_KEY, String(Date.now()));
      schedulePush();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") pushIfDirty();
      else pullIfNewer();
    });
    window.addEventListener("focus", pullIfNewer);
    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pullIfNewer();
      pushIfDirty();
    }, PULL_INTERVAL_MS);
    setInterval(() => {
      if (document.visibilityState === "visible") pushIfDirty();
    }, INTERVAL_MS);
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },
    push,
    pullIfNewer,
  };
}

export function getCloudEngine() {
  if (!engine) engine = createEngine();
  return engine;
}

export default function useCloudSync() {
  const eng = getCloudEngine();
  const [state, setState] = useState({ user: null, syncing: false, lastPushMs: 0 });

  useEffect(() => eng.subscribe(setState), [eng]);

  return { ...state, push: eng.push };
}

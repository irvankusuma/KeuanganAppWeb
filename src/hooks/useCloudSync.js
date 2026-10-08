import { useEffect, useState } from "react";
import * as Cloud from "../services/CloudSyncService";

const DEBOUNCE_MS = 3000;
const INTERVAL_MS = 5 * 60 * 1000;

let engine = null;

function createEngine() {
  const state = { user: null, syncing: false, lastPushMs: Cloud.getLastPushMs() };
  const listeners = new Set();
  let timer = null;
  let busy = false;

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
    if (!state.user) return;
    clearTimeout(timer);
    timer = setTimeout(push, DEBOUNCE_MS);
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
      }
    });

    window.addEventListener("kua:data-changed", schedulePush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") push();
    });
    setInterval(() => {
      if (document.visibilityState === "visible") push();
    }, INTERVAL_MS);
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },
    push,
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

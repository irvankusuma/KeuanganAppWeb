const CHANNEL_NAME = "kua-sync";
const EVENT_NAME = "kua:data-changed";

let channel = null;

const getChannel = () => {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type !== "data-changed") return;
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { sheet: event.data.sheet, remote: true } }),
      );
    };
  }
  return channel;
};

export function broadcastChange(sheetName) {
  getChannel()?.postMessage({ type: "data-changed", sheet: sheetName });
}

export function startRealtimeSync() {
  getChannel();
  // Tab lain yang menulis localStorage memicu event `storage` di tab ini.
  const handleStorage = (event) => {
    if (!event.key || !event.key.includes("@")) return;
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { sheet: event.key, remote: true } }),
    );
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

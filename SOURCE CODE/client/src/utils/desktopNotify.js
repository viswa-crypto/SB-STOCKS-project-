export function getPermissionStatus() {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export function requestDesktopPermission() {
  if (!("Notification" in window)) return Promise.resolve("unsupported");
  if (Notification.permission === "default") return Notification.requestPermission();
  return Promise.resolve(Notification.permission);
}

export function fireDesktopNotification(title, body, tag) {
  if (!("Notification" in window)) {
    console.warn("[desktop-notify] Notification API not supported in this browser.");
    return false;
  }
  if (Notification.permission !== "granted") {
    console.warn(`[desktop-notify] Skipped — permission is "${Notification.permission}", not granted.`);
    return false;
  }
  try {
    new Notification(title, { body, tag, icon: "/favicon.ico" });
    return true;
  } catch (err) {
    // Surfaced instead of silently swallowed — a Notification() constructor
    // throw usually means the page isn't a secure context (https/localhost)
    // or the OS itself is blocking the browser's notification permission.
    console.error("[desktop-notify] Failed to show OS notification:", err);
    return false;
  }
}

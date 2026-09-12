# Scroll or Solve — build notes

## Bug: crypto.randomUUID fails on LAN

### What went wrong
When we moved the game from `localhost` to a LAN URL (`http://10.161.4.39:5173`) so two laptops could connect over the same wifi, the React app crashed on load. Blank page, no visible error at first.

### Why
`crypto.randomUUID()` is only exposed in "secure contexts" — HTTPS or `localhost`. Raw HTTP over a LAN IP counts as insecure, so the browser removes the API entirely. Our player-ID generation was calling it directly.

### The fix
`useGameClient.ts` — wrapped the call in a feature check with a `Math.random` + timestamp fallback. Same shape, works in any context.

### What this taught us
Any Web Crypto or camera/mic API (`crypto.randomUUID`, `crypto.subtle`, `navigator.mediaDevices.getUserMedia`) silently disappears outside a secure context. We hit the same class of bug next when wiring in the CV — the camera wouldn't turn on until Chrome's insecure-origin allowlist was set for the LAN URL.

### Where it matters for the demo
The game is meant to be played on two laptops. Local dev worked, LAN didn't. Fixing this is what let us actually run multiplayer.
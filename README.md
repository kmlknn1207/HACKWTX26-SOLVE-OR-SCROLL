# Scroll or Solve

We have designed a two-player, head-to-head game. The objective? Improve concentration by integrating doom scrolling into your study habits. How does it work? Two players are given a calculus problem on a 60-second clock; depending on their speed, they get a feed of YouTube Shorts, on which players get tested to improve their retention of information. The game rewards the faster user with 5 reels and the slower one only 3 so the slower player gets a better chance at earning points. The points are given to the player who can effectively solve the prompts regarding the shorts. This process is repeated for 5 rounds, keeping track of the score, which determines the overall winner. Additionally, the camera on your device ensures you keep your eyes on the shorts to avoid the user getting distracted from their screen.

## What inspired us

We live in the same split as everyone else: one tab of homework, one tab of infinite scroll. Integrals look like

$$
\int_{0}^{1} 4x^{3}\,dx
$$

and the algorithm looks like a stack of 15-second clips. We wanted a game that does not pretend those two worlds are separate. We wanted to make it easier for students like us to be able to retain what they are studying even under constant distraction.

## What we learned

A real-time game is not a page that refreshes. Two laptops have to agree on one room, one problem, one deadline, and one ranking. We learned to treat the Node + Socket.io server as the source of truth: lobby ready-up, `playing`, playlists, scores, gaze events. The React UI is a view of that room, not a second copy of the rules.

We learned that “works on localhost” is not the same as “works on two machines.” `crypto.randomUUID()` and `getUserMedia` vanish on a plain HTTP LAN IP because it is not a secure context. Campus Wi‑Fi can also refuse laptop-to-laptop traffic, so each machine runs its own Vite client and only the host runs the game server on port 3001.

We learned KaTeX, the YouTube IFrame API (including embeds that fail with Error 153), and that a merge conflict is not a button labeled Accept both. Two branches changed the same `App.tsx`; we had to keep the Figma doodles and the server timer, not paste both blocks.

Math-wise, every bank item is a definite integral with a numeric key and a small tolerance (about $0.01$), so $\int_{0}^{2} x\,dx = 2$ and $\int_{0}^{3} 2x\,dx = 9$ can be checked without a CAS.

## How we built it

The stack is a React + Vite client (Figma Make UI in `UI/src`, Tailwind, beige/green phone chrome) and a Socket.io server in `server.js`. Shared constants live in `shared/constants.json`: 5 rounds, 60 seconds per integral, 60 points for first solver / 40 for second, 5 shorts vs 3.

Flow:

1. Create or join a room. Player 1 picks easy / medium / hard.
2. Both ready. The server starts a round, picks a problem from `data/problemBank.json`, and sets `solveDeadlineAt`.
3. Both solve the same integral. Rank decides playlist length from `data/videoBank.json`.
4. Shorts play as a tilted card deck. Gaze from the webcam (`useAttentionDetector`) can pause playback.
5. A multiple-choice question names which reel it came from (reel $N$ of 5 or 3).
6. Repeat for five rounds, then a winner.

We wired the Figma screens to `useGameClient` instead of rebuilding the look from scratch. The scoreboard is You vs opponent. The live countdown is the black circle on the problem screen, synced to the server so both laptops share one clock.

## Challenges we faced

**Two laptops, one game.** Vite’s Network URL is not the socket server. The second player had to type `http://<host-wifi-ip>:3001` as the Server URL, keep their own `localhost:5173` for the UI, and hope the network allowed it.

**The blank green screen.** A merge left `secondsLeft` and `expired` in the problem panel without defining them. As soon as both players readied, React crashed and we only saw the `#274c43` background. Fixing the countdown against `solveDeadlineAt` brought the integral back.

**Shorts that would not play.** Some embeds loop, some never fire `ENDED`, some refuse the referrer. We combined IFrame events, polling, skip-on-unavailable, and a referrer meta tag so a dead clip does not trap a player.

**Gaze in a hackathon demo.** The model needs a camera, a secure (or allowlisted) origin, and enough light. False “distracted” pauses are worse than no CV, so we kept the overlay honest: return, restart the clip, keep going.

**Git under time pressure.** `main`, `Neatpick-UI`, and a CV branch all touched the same files. We reset local `main` to GitHub when we wanted the remote as source of truth, then re-fixed the timer crash that the remote still had.

Scroll or Solve is our argument that concentration can be scored. You still have to finish

$$
\int_{a}^{b} f(x)\,dx
$$

and you still have to remember the reel. The feed is the prize. The feed is also the test.

import { createServer } from 'http';
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  TOTAL_ROUNDS,
  FIRST_SOLVER_VIDEO_COUNT,
  SECOND_SOLVER_VIDEO_COUNT,
  FIRST_SOLVER_POINTS,
  SECOND_SOLVER_POINTS,
  SERVER_PORT,
  ROUND_TRANSITION_MS,
} = JSON.parse(readFileSync(join(__dirname, 'shared/constants.json'), 'utf8'));

const problemBank = JSON.parse(
  readFileSync(join(__dirname, 'data/problemBank.json'), 'utf8'),
);
const videoBank = JSON.parse(
  readFileSync(join(__dirname, 'data/videoBank.json'), 'utf8'),
);

/** @type {Map<string, object>} */
const rooms = new Map();

const distDir = resolve(join(__dirname, 'dist'));

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (urlPath.startsWith('/socket.io')) return false;

  if (!existsSync(distDir)) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      'Scroll or Solve socket server is running.\nRun npm run build, then restart npm run server, and open this same URL in the browser.',
    );
    return true;
  }

  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const requested = resolve(distDir, relative);
  if (!requested.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  const filePath =
    existsSync(requested) && statSync(requested).isFile()
      ? requested
      : join(distDir, 'index.html');

  const type = MIME[extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(readFileSync(filePath));
  return true;
}

const httpServer = createServer((req, res) => {
  serveStatic(req, res);
});

const io = new Server(httpServer, {
  cors: { origin: true },
});

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function answersMatch(expected, given) {
  const normalize = (value) => String(value).trim().toLowerCase().replace(/,/g, '');
  return normalize(expected) === normalize(given);
}

function problemAnswerMatches(problem, given) {
  const expected = Number(problem.answer);
  const n = Number(String(given ?? '').trim().replace(/,/g, ''));
  if (!Number.isFinite(expected) || !Number.isFinite(n)) {
    return answersMatch(problem.answer, given);
  }
  const tolerance = Number(problem.tolerance);
  const allowed = Number.isFinite(tolerance) ? tolerance : 0;
  return Math.abs(n - expected) <= allowed;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickProblem(usedIds, difficulty) {
  const unusedAtDifficulty = problemBank.filter(
    (p) => p.difficulty === difficulty && !usedIds.includes(p.id),
  );
  if (unusedAtDifficulty.length > 0) return pickRandom(unusedAtDifficulty);

  const atDifficulty = problemBank.filter((p) => p.difficulty === difficulty);
  if (atDifficulty.length > 0) return pickRandom(atDifficulty);

  const unused = problemBank.filter((p) => !usedIds.includes(p.id));
  if (unused.length > 0) return pickRandom(unused);

  return pickRandom(problemBank);
}

function pickVideos(usedIds, count) {
  const picks = [];
  const used = [...usedIds];
  for (let i = 0; i < count; i += 1) {
    const unused = videoBank.filter((v) => !used.includes(v.id));
    const video = unused.length > 0 ? pickRandom(unused) : pickRandom(videoBank);
    picks.push(video);
    if (!used.includes(video.id)) used.push(video.id);
  }
  return { picks, usedIds: used };
}

function emptyPlayer(playerId, slot) {
  return {
    playerId,
    slot,
    socketId: null,
    ready: false,
    connected: false,
    phase: 'lobby',
    solveRank: null,
    videos: [],
    videoQuestion: null,
    roundPoints: 0,
    videoCorrect: null,
  };
}

function createRoom(roomCode) {
  return {
    roomCode,
    difficulty: 'easy',
    phase: 'lobby',
    round: 0,
    currentProblem: null,
    usedProblemIds: [],
    usedVideoIds: [],
    players: {},
    solvedOrder: [],
    scores: {},
    roundHistory: {},
    gazes: {},
    transitionTimer: null,
  };
}

function getPlayerList(room) {
  return Object.values(room.players).sort((a, b) => a.slot - b.slot);
}

function publicRoomState(room) {
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    round: room.round,
    totalRounds: TOTAL_ROUNDS,
    difficulty: room.difficulty,
    problem: room.currentProblem
      ? {
          id: room.currentProblem.id,
          difficulty: room.currentProblem.difficulty,
          question: room.currentProblem.question,
          latex: room.currentProblem.latex ?? null,
        }
      : null,
    players: getPlayerList(room).map((p) => ({
      playerId: p.playerId,
      slot: p.slot,
      ready: p.ready,
      connected: p.connected,
      phase: p.phase,
      solveRank: p.solveRank,
      videoCount: p.videos.length,
      roundPoints: p.roundPoints,
      videoCorrect: p.videoCorrect,
    })),
    scores: { ...room.scores },
    roundHistory: { ...room.roundHistory },
    gazes: { ...room.gazes },
    points: {
      first: FIRST_SOLVER_POINTS,
      second: SECOND_SOLVER_POINTS,
    },
    winnerSlot: winnerSlot(room),
  };
}

function winnerSlot(room) {
  const list = getPlayerList(room);
  if (list.length < 2 || room.phase !== 'finished') return null;
  const [a, b] = list;
  const sa = room.scores[a.playerId] ?? 0;
  const sb = room.scores[b.playerId] ?? 0;
  if (sa === sb) return 0;
  return sa > sb ? a.slot : b.slot;
}

function emitRoomUpdate(room) {
  io.to(room.roomCode).emit('room-update', publicRoomState(room));
}

function emitPrivatePlaylist(socket, player) {
  socket.emit('you-playlist', {
    videos: player.videos.map((v) => ({ id: v.id, youtubeId: v.youtubeId })),
    question: player.videoQuestion
      ? {
          videoId: player.videoQuestion.videoId,
          question: player.videoQuestion.question,
          options: player.videoQuestion.options,
        }
      : null,
  });
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    for (const player of Object.values(room.players)) {
      if (player.socketId === socketId) return { room, player };
    }
  }
  return null;
}

function bothReady(room) {
  const list = getPlayerList(room);
  return list.length === 2 && list.every((p) => p.ready && p.connected);
}

function bothRoundComplete(room) {
  const list = getPlayerList(room);
  return list.length === 2 && list.every((p) => p.phase === 'round_complete');
}

function startRound(room) {
  if (room.transitionTimer) {
    clearTimeout(room.transitionTimer);
    room.transitionTimer = null;
  }

  const problem = pickProblem(room.usedProblemIds, room.difficulty);
  if (!room.usedProblemIds.includes(problem.id)) {
    room.usedProblemIds.push(problem.id);
  }

  room.phase = 'playing';
  room.round += 1;
  room.currentProblem = problem;
  room.solvedOrder = [];

  for (const player of Object.values(room.players)) {
    player.phase = 'solving';
    player.ready = false;
    player.solveRank = null;
    player.videos = [];
    player.videoQuestion = null;
    player.roundPoints = 0;
    player.videoCorrect = null;
  }

  emitRoomUpdate(room);
}

function maybeAdvanceRound(room) {
  if (!bothRoundComplete(room)) return;

  if (room.round >= TOTAL_ROUNDS) {
    room.phase = 'finished';
    for (const player of Object.values(room.players)) {
      player.phase = 'game_complete';
    }
    emitRoomUpdate(room);
    return;
  }

  room.phase = 'round_transition';
  emitRoomUpdate(room);

  room.transitionTimer = setTimeout(() => {
    room.transitionTimer = null;
    if (!rooms.has(room.roomCode)) return;
    startRound(room);
  }, ROUND_TRANSITION_MS);
}

function recordRound(room, player) {
  const history = room.roundHistory[player.playerId] ?? [];
  history.push({
    round: room.round,
    solveRank: player.solveRank,
    videoCorrect: player.videoCorrect,
    points: player.roundPoints,
    problemId: room.currentProblem?.id ?? '',
  });
  room.roundHistory[player.playerId] = history;
}

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomCode, playerId } = {}) => {
    if (!playerId || typeof playerId !== 'string') {
      socket.emit('join-error', { message: 'playerId is required' });
      return;
    }

    let code = String(roomCode ?? '')
      .trim()
      .toUpperCase();
    if (!code) code = generateRoomCode();

    let room = rooms.get(code);
    if (!room) {
      room = createRoom(code);
      rooms.set(code, room);
    }

    const existing = room.players[playerId];
    if (existing) {
      existing.socketId = socket.id;
      existing.connected = true;
      socket.join(code);
      socket.emit('joined', { roomCode: code, playerId, slot: existing.slot });
      if (existing.videos.length > 0) emitPrivatePlaylist(socket, existing);
      emitRoomUpdate(room);
      return;
    }

    const occupiedSlots = getPlayerList(room).map((p) => p.slot);
    if (occupiedSlots.length >= 2) {
      socket.emit('join-error', { message: 'Room is full' });
      return;
    }

    const slot = occupiedSlots.includes(1) ? 2 : 1;
    const player = emptyPlayer(playerId, slot);
    player.socketId = socket.id;
    player.connected = true;
    room.players[playerId] = player;
    room.scores[playerId] = room.scores[playerId] ?? 0;
    room.roundHistory[playerId] = room.roundHistory[playerId] ?? [];
    room.gazes[playerId] = true;

    socket.join(code);
    socket.emit('joined', { roomCode: code, playerId, slot });
    emitRoomUpdate(room);
  });

  socket.on('set-difficulty', ({ roomCode, playerId, difficulty } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    if (!room || room.phase !== 'lobby') return;
    const player = room.players[playerId];
    if (!player || player.slot !== 1) return;
    if (!['easy', 'medium', 'hard'].includes(difficulty)) return;
    room.difficulty = difficulty;
    for (const p of Object.values(room.players)) p.ready = false;
    emitRoomUpdate(room);
  });

  socket.on('set-ready', ({ roomCode, playerId, ready } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    if (!room || room.phase !== 'lobby') return;
    const player = room.players[playerId];
    if (!player) return;
    player.ready = Boolean(ready);
    emitRoomUpdate(room);
    if (bothReady(room)) {
      room.round = 0;
      room.usedProblemIds = [];
      room.usedVideoIds = [];
      room.scores = {};
      room.roundHistory = {};
      for (const p of Object.values(room.players)) {
        room.scores[p.playerId] = 0;
        room.roundHistory[p.playerId] = [];
      }
      startRound(room);
    }
  });

  socket.on('submit-problem-answer', ({ roomCode, playerId, answer } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    if (!room || room.phase !== 'playing' || !room.currentProblem) return;
    const player = room.players[playerId];
    if (!player || player.socketId !== socket.id) return;
    if (player.phase !== 'solving') return;

    if (!problemAnswerMatches(room.currentProblem, answer ?? '')) {
      socket.emit('problem-incorrect');
      return;
    }

    // Server arrival order is the only source of truth for first vs second solver.
    if (room.solvedOrder.includes(playerId)) return;

    room.solvedOrder.push(playerId);
    const rank = room.solvedOrder.length;
    player.solveRank = rank;

    const count = rank === 1 ? FIRST_SOLVER_VIDEO_COUNT : SECOND_SOLVER_VIDEO_COUNT;
    const { picks, usedIds } = pickVideos(room.usedVideoIds, count);
    room.usedVideoIds = usedIds;
    player.videos = picks;

    const source = pickRandom(picks);
    player.videoQuestion = {
      videoId: source.id,
      question: source.question,
      options: source.options,
      correct: source.correct,
    };
    player.phase = 'watching';

    emitPrivatePlaylist(socket, player);
    emitRoomUpdate(room);
  });

  socket.on('submit-video-answer', ({ roomCode, playerId, videoId, answer } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    if (!room || room.phase !== 'playing') return;
    const player = room.players[playerId];
    if (!player || player.socketId !== socket.id) return;
    if (player.phase !== 'question' && player.phase !== 'watching') return;
    if (!player.videoQuestion) return;
    if (videoId && videoId !== player.videoQuestion.videoId) return;

    const correct = answersMatch(player.videoQuestion.correct, answer ?? '');
    player.videoCorrect = correct;
    const pot =
      player.solveRank === 1 ? FIRST_SOLVER_POINTS : SECOND_SOLVER_POINTS;
    player.roundPoints = correct ? pot : 0;
    room.scores[playerId] = (room.scores[playerId] ?? 0) + player.roundPoints;
    player.phase = 'round_complete';
    recordRound(room, player);
    emitRoomUpdate(room);
    maybeAdvanceRound(room);
  });

  socket.on('videos-finished', ({ roomCode, playerId } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    if (!room) return;
    const player = room.players[playerId];
    if (!player || player.socketId !== socket.id) return;
    if (player.phase !== 'watching') return;
    player.phase = 'question';
    emitRoomUpdate(room);
  });

  socket.on('play-again', ({ roomCode, playerId } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    if (!room) return;
    const player = room.players[playerId];
    if (!player) return;
    if (room.transitionTimer) {
      clearTimeout(room.transitionTimer);
      room.transitionTimer = null;
    }
    room.phase = 'lobby';
    room.round = 0;
    room.currentProblem = null;
    room.usedProblemIds = [];
    room.usedVideoIds = [];
    room.solvedOrder = [];
    for (const p of Object.values(room.players)) {
      p.ready = false;
      p.phase = 'lobby';
      p.solveRank = null;
      p.videos = [];
      p.videoQuestion = null;
      p.roundPoints = 0;
      p.videoCorrect = null;
    }
    emitRoomUpdate(room);
  });

  socket.on('gaze-status', ({ roomCode, playerId, isWatchingScreen } = {}) => {
    const room = rooms.get(String(roomCode ?? '').toUpperCase());
    const watching = Boolean(isWatchingScreen);
    console.log('[gaze-status]', {
      roomCode,
      playerId,
      isWatchingScreen: watching,
      at: new Date().toISOString(),
    });

    if (room && room.players[playerId]) {
      room.gazes[playerId] = watching;
      // HOOK (CV / gaze penalty — not active yet):
      // If isWatchingScreen is false while this player is in phase "watching",
      // apply a penalty here (e.g. forfeit the round's video points, add a
      // look-away strike, or force an extra video). Do not trust a client-side
      // penalty; keep the decision on the server when that module is wired up.
      io.to(room.roomCode).emit('gaze-status', {
        playerId,
        isWatchingScreen: watching,
      });
    }
  });

  socket.on('disconnect', () => {
    const found = findRoomBySocket(socket.id);
    if (!found) return;
    const { room, player } = found;
    player.connected = false;
    player.socketId = null;
    emitRoomUpdate(room);

    const anyoneConnected = getPlayerList(room).some((p) => p.connected);
    if (!anyoneConnected) {
      if (room.transitionTimer) clearTimeout(room.transitionTimer);
      rooms.delete(room.roomCode);
    }
  });
});

httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
  console.log(`Game server listening on 0.0.0.0:${SERVER_PORT}`);
  console.log(`On this PC open  http://localhost:${SERVER_PORT}`);
  console.log(`On the other laptop open  http://<this-pc-wifi-ip>:${SERVER_PORT}`);
});

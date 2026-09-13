import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { bindGazeEmitter, reportGazeStatus } from '../gaze/gazeBridge';
import { DEFAULT_SERVER_URL } from '../game/constants';
import type {
  Difficulty,
  PlaylistVideo,
  RoomState,
  VideoQuestion,
} from '../types';

const PLAYER_KEY = 'sos.playerId';
const SERVER_KEY = 'sos.serverUrl';

function getOrCreatePlayerId(): string {
  const existing = sessionStorage.getItem(PLAYER_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(PLAYER_KEY, id);
  return id;
}

function loadServerUrl(): string {
  const saved = localStorage.getItem(SERVER_KEY);
  if (saved?.includes('localhost') && window.location.hostname !== 'localhost') {
    return DEFAULT_SERVER_URL;
  }
  return saved ?? DEFAULT_SERVER_URL;
}

export function useGameClient() {
  const [serverUrl, setServerUrlState] = useState(loadServerUrl);
  const [playerId] = useState(getOrCreatePlayerId);
  const [slot, setSlot] = useState<1 | 2 | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistVideo[]>([]);
  const [videoQuestion, setVideoQuestion] = useState<VideoQuestion | null>(null);
  const [videoIndex, setVideoIndex] = useState(0);
  const [problemError, setProblemError] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const roomCodeRef = useRef<string | null>(null);

  const setServerUrl = useCallback((url: string) => {
    const trimmed = url.trim().replace(/\/$/, '');
    setServerUrlState(trimmed);
    localStorage.setItem(SERVER_KEY, trimmed);
  }, []);

  const closeSocket = useCallback(() => {
    bindGazeEmitter(null);
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    closeSocket();
    setConnected(false);
    setConnecting(false);
    setRoom(null);
    roomCodeRef.current = null;
    setRoomCode(null);
    setSlot(null);
    setPlaylist([]);
    setVideoQuestion(null);
    setVideoIndex(0);
  }, [closeSocket]);

  const connectAndJoin = useCallback(
    (code: string) => {
      setJoinError(null);
      closeSocket();
      setConnecting(true);

      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (socketRef.current !== socket) return;
        setConnected(true);
        setConnecting(false);
        socket.emit('join-room', { roomCode: code, playerId });
      });

      socket.on('connect_error', (err) => {
        if (socketRef.current !== socket) return;
        setConnecting(false);
        setJoinError(`Could not reach server at ${serverUrl}: ${err.message}`);
      });

      socket.on('joined', (payload: { roomCode: string; playerId: string; slot: 1 | 2 }) => {
        if (socketRef.current !== socket) return;
        roomCodeRef.current = payload.roomCode;
        setRoomCode(payload.roomCode);
        setSlot(payload.slot);
      });

      socket.on('join-error', (payload: { message: string }) => {
        if (socketRef.current !== socket) return;
        setJoinError(payload.message);
        socket.disconnect();
      });

      socket.on('room-update', (next: RoomState) => {
        if (socketRef.current !== socket) return;
        setRoom(next);
        const me = next.players.find((p) => p.playerId === playerId);
        if (me?.phase === 'solving') {
          setPlaylist([]);
          setVideoQuestion(null);
          setVideoIndex(0);
          setProblemError(false);
        }
      });

      socket.on(
        'you-playlist',
        (payload: { videos: PlaylistVideo[]; question: VideoQuestion | null }) => {
          if (socketRef.current !== socket) return;
          setPlaylist(payload.videos);
          setVideoQuestion(payload.question);
          setVideoIndex(0);
          setProblemError(false);
        },
      );

      socket.on('problem-incorrect', () => {
        if (socketRef.current !== socket) return;
        setProblemError(true);
      });

      socket.on('disconnect', () => {
        if (socketRef.current !== socket) return;
        setConnected(false);
      });

      bindGazeEmitter(({ isWatchingScreen }) => {
        socket.emit('gaze-status', {
          roomCode: roomCodeRef.current,
          playerId,
          isWatchingScreen,
        });
      });
    },
    [closeSocket, playerId, serverUrl],
  );

  useEffect(() => {
    return () => {
      bindGazeEmitter(null);
      socketRef.current?.disconnect();
    };
  }, []);

  const createRoom = useCallback(() => {
    connectAndJoin('');
  }, [connectAndJoin]);

  const joinRoom = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setJoinError('Enter a room code');
        return;
      }
      connectAndJoin(trimmed);
    },
    [connectAndJoin],
  );

  const setDifficulty = useCallback(
    (difficulty: Difficulty) => {
      if (!roomCode) return;
      socketRef.current?.emit('set-difficulty', { roomCode, playerId, difficulty });
    },
    [playerId, roomCode],
  );

  const setReady = useCallback(
    (ready: boolean) => {
      if (!roomCode) return;
      socketRef.current?.emit('set-ready', { roomCode, playerId, ready });
    },
    [playerId, roomCode],
  );

  const submitProblemAnswer = useCallback(
    (answer: string) => {
      if (!roomCode) return;
      setProblemError(false);
      socketRef.current?.emit('submit-problem-answer', { roomCode, playerId, answer });
    },
    [playerId, roomCode],
  );

  const finishVideos = useCallback(() => {
    if (!roomCode) return;
    socketRef.current?.emit('videos-finished', { roomCode, playerId });
  }, [playerId, roomCode],
  );

  const onVideoEnded = useCallback(() => {
    setVideoIndex((index) => {
      const next = index + 1;
      if (next >= playlist.length) {
        finishVideos();
        return index;
      }
      return next;
    });
  }, [finishVideos, playlist.length]);

  const setWatchIndex = useCallback((index: number) => {
    setVideoIndex(index);
  }, []);

  const submitVideoAnswer = useCallback(
    (answer: string) => {
      if (!roomCode || !videoQuestion) return;
      socketRef.current?.emit('submit-video-answer', {
        roomCode,
        playerId,
        videoId: videoQuestion.videoId,
        answer,
      });
    },
    [playerId, roomCode, videoQuestion],
  );

  const playAgain = useCallback(() => {
    if (!roomCode) return;
    socketRef.current?.emit('play-again', { roomCode, playerId });
  }, [playerId, roomCode]);

  const me = useMemo(
    () => room?.players.find((p) => p.playerId === playerId) ?? null,
    [playerId, room],
  );
  const opponent = useMemo(
    () => room?.players.find((p) => p.playerId !== playerId) ?? null,
    [playerId, room],
  );

  return {
    serverUrl,
    setServerUrl,
    playerId,
    slot,
    roomCode,
    room,
    me,
    opponent,
    playlist,
    videoQuestion,
    videoIndex,
    problemError,
    joinError,
    connected,
    connecting,
    createRoom,
    joinRoom,
    leaveRoom: disconnect,
    setDifficulty,
    setReady,
    submitProblemAnswer,
    onVideoEnded,
    setWatchIndex,
    submitVideoAnswer,
    playAgain,
    reportGazeStatus,
  };
}

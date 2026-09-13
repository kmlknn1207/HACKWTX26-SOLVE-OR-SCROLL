import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { reportGazeStatus } from './gazeBridge';

const GAZE_H_LIMIT = 0.55;
const GAZE_V_LIMIT = 0.55;
const EYE_CLOSED = 0.4;
const EYE_HOLD_MS = 400;
const SOFT_MS = 800;
const HARD_MS = 2500;

export type AttentionState = 'idle' | 'attentive' | 'warning' | 'distracted';

interface Options {
  enabled: boolean;
  onDistracted?: () => void;
}

interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

function bsScore(bs: BlendshapeCategory[], name: string): number {
  const c = bs.find(x => x.categoryName === name);
  return c ? c.score : 0;
}

function cameraErrorMessage(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera needs a secure page. On this laptop open http://localhost:5173 — not the Wi‑Fi IP, and not a Google search.';
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'This browser has no camera API. Use Chrome or Edge, not the search box on google.com.';
  }
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission is blocked. Allow the camera for this site in Chrome/Edge settings, then reload.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this laptop.';
  }
  return err instanceof Error ? err.message : 'Camera or face tracking failed to start.';
}

export function useAttentionDetector({ enabled, onDistracted }: Options) {
  const [state, setState] = useState<AttentionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<AttentionState>('idle');
  const onDistractedRef = useRef(onDistracted);
  onDistractedRef.current = onDistracted;

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      stateRef.current = 'idle';
      return;
    }

    let cancelled = false;
    let landmarker: FaceLandmarker | null = null;
    let stream: MediaStream | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let rafId = 0;
    let notAttentiveSince: number | null = null;
    let eyesClosedSince: number | null = null;

    const setAttentionState = (next: AttentionState) => {
      if (stateRef.current === next) return;
      stateRef.current = next;
      setState(next);

      if (next === 'attentive') reportGazeStatus({ isWatchingScreen: true });
      else if (next === 'warning' || next === 'distracted')
        reportGazeStatus({ isWatchingScreen: false });

      if (next === 'distracted') onDistractedRef.current?.();
    };

    const loop = () => {
      if (cancelled || !landmarker || !videoEl) return;
      const now = performance.now();
      let notAttentive = false;

      try {
        const result = landmarker.detectForVideo(videoEl, now);

        if (result.faceBlendshapes.length > 0) {
          const bs = result.faceBlendshapes[0].categories;

          const lookRight = (bsScore(bs, 'eyeLookInLeft') + bsScore(bs, 'eyeLookOutRight')) / 2;
          const lookLeft = (bsScore(bs, 'eyeLookOutLeft') + bsScore(bs, 'eyeLookInRight')) / 2;
          const gazeH = lookRight - lookLeft;

          const lookUp = (bsScore(bs, 'eyeLookUpLeft') + bsScore(bs, 'eyeLookUpRight')) / 2;
          const lookDown = (bsScore(bs, 'eyeLookDownLeft') + bsScore(bs, 'eyeLookDownRight')) / 2;
          const gazeV = lookUp - lookDown;

          if (Math.abs(gazeH) > GAZE_H_LIMIT) notAttentive = true;
          else if (Math.abs(gazeV) > GAZE_V_LIMIT) notAttentive = true;

          const eyeL = bsScore(bs, 'eyeBlinkLeft');
          const eyeR = bsScore(bs, 'eyeBlinkRight');
          const bothClosed = eyeL > EYE_CLOSED && eyeR > EYE_CLOSED;
          if (bothClosed) {
            if (eyesClosedSince === null) eyesClosedSince = now;
            if (now - eyesClosedSince > EYE_HOLD_MS) notAttentive = true;
          } else {
            eyesClosedSince = null;
          }
        } else {
          notAttentive = true;
        }

        if (notAttentive) {
          if (notAttentiveSince === null) notAttentiveSince = now;
        } else {
          notAttentiveSince = null;
        }

        const duration = notAttentiveSince ? now - notAttentiveSince : 0;
        let next: AttentionState;
        if (!notAttentive || duration < SOFT_MS) next = 'attentive';
        else if (duration < HARD_MS) next = 'warning';
        else next = 'distracted';

        setAttentionState(next);
      } catch {
        /* ignore per-frame errors */
      }

      rafId = requestAnimationFrame(loop);
    };

    const createLandmarker = async (vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate,
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });

    const init = async () => {
      try {
        setError(null);
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error(cameraErrorMessage(null));
        }

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm',
        );
        if (cancelled) return;

        try {
          landmarker = await createLandmarker(vision, 'GPU');
        } catch {
          landmarker = await createLandmarker(vision, 'CPU');
        }
        if (cancelled) return;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        Object.assign(videoEl.style, {
          position: 'fixed',
          opacity: '0',
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          left: '-9999px',
          top: '-9999px',
        });
        document.body.appendChild(videoEl);

        await new Promise<void>(resolve => {
          videoEl!.onloadedmetadata = () => resolve();
        });
        await videoEl.play().catch(() => undefined);
        if (cancelled) return;

        setAttentionState('attentive');
        loop();
      } catch (err) {
        console.error('[gaze] init failed:', err);
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(t => t.stop());
      videoEl?.remove();
      landmarker?.close();
      setState('idle');
      stateRef.current = 'idle';
      setError(null);
    };
  }, [enabled]);

  return { state, error };
}
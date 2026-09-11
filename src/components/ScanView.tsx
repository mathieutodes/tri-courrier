import { useEffect, useRef, useState } from 'react';
import * as Tesseract from 'tesseract.js';
import { usePersons } from '../db/personStore';
import type { Person } from '../types/person';
import { matchPersonFromOcrText, type OcrMatchResult } from '../utils/ocrMatch';
import { computeGuideCropRect } from '../utils/scanGeometry';
import { INITIAL_SCAN_DISPLAY_STATE, nextScanDisplayState, type ScanDisplayState } from '../utils/scanSession';
import ResultCard from './ResultCard';
import { CameraIcon, CloseIcon } from './icons';

interface Props {
  onClose: () => void;
}

/** Fraction du cadre de visée central (largeur/hauteur de l'écran). */
const GUIDE_FRACTION = { widthFraction: 0.84, heightFraction: 0.3 };
/** Intervalle entre deux analyses OCR (ms) — compromis fluidité / batterie / charge CPU. */
const OCR_INTERVAL_MS = 900;

/**
 * Assets OCR (worker + moteur WASM + modèle de langue) servis EN LOCAL
 * (voir public/tesseract/), jamais depuis un CDN : nécessaire pour un
 * fonctionnement 100% hors-ligne, et pré-mis en cache par le service worker
 * PWA (voir vite.config.ts) au même titre que le reste de l'application.
 */
function tesseractAssetPaths() {
  const base = import.meta.env.BASE_URL;
  return {
    workerPath: `${base}tesseract/worker.min.js`,
    corePath: `${base}tesseract/tesseract-core-lstm.js`,
    langPath: `${base}tesseract/lang`,
  };
}

interface DebugInfo {
  text: string;
  durationMs: number;
  result: OcrMatchResult;
  error?: string;
}

function statusLabel(status: OcrMatchResult['status']): string {
  if (status === 'match') return 'CORRESPONDANCE';
  if (status === 'ambiguous') return 'AMBIGU';
  return 'AUCUNE';
}

export default function ScanView({ onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Garde de réentrance : empêche deux cycles OCR de se chevaucher si une
  // analyse dure plus longtemps que l'intervalle.
  const ocrRunningRef = useRef(false);
  const displayRef = useRef<ScanDisplayState>(INITIAL_SCAN_DISPLAY_STATE);
  const personsRef = useRef<Person[]>([]);

  const allPersons = usePersons();
  personsRef.current = allPersons;

  const [display, setDisplay] = useState<ScanDisplayState>(INITIAL_SCAN_DISPLAY_STATE);
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [debugOpen, setDebugOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function runOcrCycle() {
      const video = videoRef.current;
      const container = containerRef.current;
      const worker = workerRef.current;
      if (!video || !container || !worker) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (ocrRunningRef.current) return; // un cycle est déjà en cours : on saute celui-ci
      ocrRunningRef.current = true;

      const start = performance.now();
      try {
        // Canvas de travail EN MÉMOIRE UNIQUEMENT : jamais ajouté au DOM,
        // jamais exporté vers un fichier, réutilisé et réécrit à chaque
        // cycle, abandonné (GC) à la fermeture du mode SCAN.
        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvasRef.current = canvas;

        const crop = computeGuideCropRect(
          video.videoWidth,
          video.videoHeight,
          container.clientWidth,
          container.clientHeight,
          GUIDE_FRACTION,
        );
        canvas.width = Math.round(crop.sw);
        canvas.height = Math.round(crop.sh);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);

        const { data } = await worker.recognize(canvas);
        if (cancelled) return;
        const durationMs = performance.now() - start;
        const result = matchPersonFromOcrText(data.text, personsRef.current);
        const next = nextScanDisplayState(displayRef.current, result);
        displayRef.current = next;
        setDisplay(next);
        setDebug({ text: data.text.trim(), durationMs, result });
      } catch (err) {
        if (!cancelled) {
          setDebug((prev) => ({
            text: prev?.text ?? '',
            durationMs: performance.now() - start,
            result: prev?.result ?? { status: 'none', candidates: [] },
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      } finally {
        ocrRunningRef.current = false;
      }
    }

    async function start() {
      // 1. Caméra arrière, flux vidéo en direct UNIQUEMENT (aucun enregistrement).
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage('Impossible d’accéder à la caméra. Vérifiez l’autorisation caméra.');
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Lecture bloquée (rare) : on continue, l'utilisateur peut retenter FERMER/SCAN.
        }
      }

      // 2. Moteur OCR local (WASM), assets servis depuis public/tesseract/.
      try {
        const worker = await Tesseract.createWorker('fra', 1, {
          ...tesseractAssetPaths(),
          gzip: true,
          // Pas de cache IndexedDB propre à Tesseract : les assets sont déjà
          // pré-mis en cache par le service worker PWA, et on ne veut faire
          // naître aucun stockage supplémentaire pour le mode SCAN.
          cacheMethod: 'none',
        });
        if (cancelled) {
          void worker.terminate();
          return;
        }
        workerRef.current = worker;
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage('Impossible d’initialiser la reconnaissance de texte locale.');
        }
        return;
      }

      if (cancelled) return;
      setStatus('ready');
      intervalId = window.setInterval(() => {
        void runOcrCycle();
      }, OCR_INTERVAL_MS);
    }

    void start();

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      ocrRunningRef.current = false;

      // Arrêt complet et immédiat du flux caméra : aucune trace ne doit
      // subsister après la fermeture du mode SCAN.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;

      const worker = workerRef.current;
      workerRef.current = null;
      if (worker) void worker.terminate();

      canvasRef.current = null;
      displayRef.current = INITIAL_SCAN_DISPLAY_STATE;
    };
  }, []);

  return (
    <div className="scan-overlay" ref={containerRef}>
      <video ref={videoRef} className="scan-video" autoPlay playsInline muted />

      <div className="scan-topbar">
        <button type="button" className="scan-close-btn" onClick={onClose}>
          <CloseIcon size={18} />
          FERMER
        </button>
      </div>

      {status === 'starting' && (
        <div className="scan-hint scan-hint-center">Ouverture de la caméra…</div>
      )}

      {status === 'error' && (
        <div className="scan-hint scan-hint-center scan-hint-error">{errorMessage}</div>
      )}

      {status === 'ready' && !display.person && (
        <>
          <div className="scan-guide" aria-hidden="true" />
          <div className="scan-hint">
            <CameraIcon size={18} />
            Présentez le nom et l’adresse dans le cadre
          </div>
        </>
      )}

      {display.person && (
        <div className="scan-result">
          <ResultCard person={display.person} />
        </div>
      )}

      <div className={`scan-debug${debugOpen ? '' : ' scan-debug-collapsed'}`}>
        <button
          type="button"
          className="scan-debug-toggle"
          onClick={() => setDebugOpen((v) => !v)}
        >
          DEBUG {debugOpen ? '▾' : '▸'}
        </button>
        {debugOpen && (
          <div className="scan-debug-body">
            <div>
              <strong>Statut :</strong> {debug ? statusLabel(debug.result.status) : '—'}
            </div>
            <div>
              <strong>Durée analyse :</strong>{' '}
              {debug ? `${Math.round(debug.durationMs)} ms` : '—'}
            </div>
            <div>
              <strong>Candidat :</strong>{' '}
              {debug && debug.result.status !== 'none' && debug.result.candidates[0]
                ? `${debug.result.candidates[0].person.nom} (confiance ${(debug.result.candidates[0].confidence * 100).toFixed(0)}%)`
                : '—'}
            </div>
            <div>
              <strong>Texte OCR :</strong>
              <div className="scan-debug-text">{debug?.text || '—'}</div>
            </div>
            {debug?.error && <div className="scan-debug-error">Erreur : {debug.error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

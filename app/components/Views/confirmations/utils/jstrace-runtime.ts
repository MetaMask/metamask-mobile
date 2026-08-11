/* eslint-disable no-console */
// TEMP full-program tracing runtime (Remove before merge).
//
// Installs global.__jt(phase, name) — the hook that scripts/babel-plugin-jstrace.js
// injects at the top and bottom of every function. Records a flat event stream
// (phase, internedNameId, timestampUs) into a preallocated ring buffer so
// per-call overhead is a couple of array writes (no allocation, no stack
// unwinding). Async/generators stay correct because every enter/exit is an
// independent timestamped event; the tree is rebuilt offline.
//
// Import this ONCE, as early as possible (top of index.js / App entry), BEHIND
// the JSTRACE flag so production is untouched:
//
//   if (global.__JSTRACE__) require('.../jstrace-runtime');
//
// Then: start with global.__jtStart(), run the flow, global.__jtStop(), and
// global.__jtDump() to write the Speedscope-evented JSON to the app cache dir.

import RNFS from 'react-native-fs';

type Phase = 0 | 1; // 0=enter, 1=exit

const CAP = 16_000_000; // ~16M events; 3 typed arrays => ~208MB. Ring-buffer.
// (Uint8 1B + Uint32 4B + Float64 8B = 13B/event.) Whole-program denylist
// instrumentation on the boot->CTA path is far heavier than the old allowlist,
// so this is sized to avoid wrapping before CTA->VISIBLE. If it still wraps
// (see the [JSTRACE] stop log), start recording later or raise again.
const phases = new Uint8Array(CAP);
const nameIds = new Uint32Array(CAP);
const times = new Float64Array(CAP); // microseconds

const names: string[] = [];
const nameIndex = new Map<string, number>();

let head = 0; // next write position
let wrapped = false;
let recording = false;

// TEMP jstrace status pub/sub (Remove before merge). Lets the on-screen
// PerfOverlay show when a trace starts recording, when the async file write
// begins, and when it has actually flushed to disk (or errored) — so you never
// have to guess whether a trace file was produced.
export type JstraceStatus =
  | { kind: 'recording' }
  | { kind: 'writing' }
  | { kind: 'written'; events: number; wrapped: boolean; path: string }
  | { kind: 'error'; message: string };

let lastStatus: JstraceStatus | null = null;
const statusListeners = new Set<(s: JstraceStatus) => void>();

export function subscribeJstrace(fn: (s: JstraceStatus) => void): () => void {
  statusListeners.add(fn);
  if (lastStatus !== null) {
    fn(lastStatus);
  }
  return () => {
    statusListeners.delete(fn);
  };
}

function emitStatus(s: JstraceStatus): void {
  lastStatus = s;
  statusListeners.forEach((fn) => fn(s));
}

const nowUs = (): number =>
  typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now() * 1000
    : Date.now() * 1000;

function intern(name: string): number {
  let id = nameIndex.get(name);
  if (id === undefined) {
    id = names.length;
    names.push(name);
    nameIndex.set(name, id);
  }
  return id;
}

// The hot path. Keep it allocation-free.
function jt(phase: Phase, name: string): void {
  if (!recording) return;
  const id = intern(name);
  const i = head;
  phases[i] = phase;
  nameIds[i] = id;
  times[i] = nowUs();
  head = i + 1;
  if (head >= CAP) {
    head = 0;
    wrapped = true;
  }
}

function start(): void {
  head = 0;
  wrapped = false;
  recording = true;
  console.log('[JSTRACE] recording started');
  emitStatus({ kind: 'recording' });
}

function stop(): void {
  recording = false;
  const n = wrapped ? CAP : head;
  console.log(
    `[JSTRACE] recording stopped — ${n} events, ${names.length} unique frames`,
  );
  if (wrapped) {
    console.warn(
      `[JSTRACE] ⚠️ RING BUFFER WRAPPED at CAP=${CAP} — oldest events were ` +
        `OVERWRITTEN, so the trace is TRUNCATED (missing the earliest part of ` +
        `the CTA->VISIBLE window). Raise CAP in jstrace-runtime.ts or start ` +
        `recording later.`,
    );
  }
}

// Convert the flat event stream to Speedscope's "evented" profile format and
// write to the app cache dir; returns the path (shareable / pullable).
async function dump(
  fileName = `jstrace-${Date.now()}.speedscope.json`,
): Promise<string> {
  const total = wrapped ? CAP : head;
  // Reconstruct chronological order if the ring wrapped.
  const order: number[] = new Array(total);
  if (wrapped) {
    // Oldest entry is at `head` (which now points at the next-to-overwrite).
    for (let k = 0; k < total; k++) order[k] = (head + k) % CAP;
  } else {
    for (let k = 0; k < total; k++) order[k] = k;
  }

  const events = new Array(total);
  const startUs = total ? times[order[0]] : 0;
  for (let k = 0; k < total; k++) {
    const i = order[k];
    events[k] = {
      type: phases[i] === 0 ? 'O' : 'C', // Open / Close
      frame: nameIds[i],
      at: times[i] - startUs,
    };
  }
  const endUs = total ? times[order[total - 1]] - startUs : 0;

  const profile = {
    $schema: 'https://www.speedscope.app/file-format-schema.json',
    shared: { frames: names.map((name) => ({ name })) },
    profiles: [
      {
        type: 'evented',
        name: 'jstrace',
        unit: 'microseconds',
        startValue: 0,
        endValue: endUs,
        events,
      },
    ],
    name: fileName,
    activeProfileIndex: 0,
    exporter: 'jstrace-runtime',
  };

  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  emitStatus({ kind: 'writing' });
  try {
    await RNFS.writeFile(path, JSON.stringify(profile), 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[JSTRACE] write FAILED -> ${path}: ${message}`);
    emitStatus({ kind: 'error', message });
    throw err;
  }
  console.log(`[JSTRACE] wrote ${total} events -> ${path}`);
  emitStatus({ kind: 'written', events: total, wrapped, path });
  return path;
}

const g = globalThis as Record<string, unknown>;
g.__jt = jt;
g.__jtStart = start;
g.__jtStop = stop;
g.__jtDump = dump;

console.log('[JSTRACE] runtime installed — call global.__jtStart() to record');

export { jt, start, stop, dump };

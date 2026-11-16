import { readFileSync } from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import type { FileResult } from './baseline.ts';
import { compileSource } from './compile.ts';

const { files, root } = workerData as { files: string[]; root: string };
const results: FileResult[] = files.map((path) => ({
  path,
  failures: compileSource(readFileSync(`${root}/${path}`, 'utf8'), path),
}));
parentPort?.postMessage(results);

/* eslint-disable import-x/no-nodejs-modules */
// tests/visual/orchestrator/rewrite-flow.ts
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const TMP_DIR = path.join(__dirname, '..', '.tmp');

/**
 * Rewrite a Maestro flow YAML, converting assertScreenshot to takeScreenshot.
 * Strips .png extension from paths and removes thresholdPercentage.
 * Returns the path to the rewritten temp file.
 */
export function rewriteFlowForCapture(flowPath: string): string {
  mkdirSync(TMP_DIR, { recursive: true });

  let content = readFileSync(flowPath, 'utf-8');

  // Block syntax: - assertScreenshot:\n    path: foo.png
  content = content.replace(/- assertScreenshot:/g, '- takeScreenshot:');

  // Inline syntax: - assertScreenshot: foo.png
  content = content.replace(
    /- takeScreenshot:\s+([^\n]+\.png)/g,
    (_, p) => `- takeScreenshot: ${p.replace(/\.png$/, '')}`,
  );

  // Block path: path: foo.png (after the assertScreenshot -> takeScreenshot rename)
  content = content.replace(/(\s+path:\s+)([^\n]+)\.png/g, '$1$2');

  // Remove thresholdPercentage lines (not used by takeScreenshot)
  content = content.replace(/\s+thresholdPercentage:\s+\d+(\.\d+)?\n/g, '\n');

  const tempFileName = path.basename(flowPath);
  const tempPath = path.join(TMP_DIR, tempFileName);
  writeFileSync(tempPath, content, 'utf-8');

  return tempPath;
}

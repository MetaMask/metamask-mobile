import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const TMP_DIR = path.join(__dirname, '..', '.tmp');
const FLOWS_DIR = path.join(__dirname, '..', 'flows');

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

  // Inline syntax: - takeScreenshot: foo.png (same line only, [ \t]+ avoids matching newlines)
  content = content.replace(
    /- takeScreenshot:[ \t]+([^\n]+\.png)/g,
    (_, p) => `- takeScreenshot: ${p.replace(/\.png$/, '')}`,
  );

  // Block path: path: foo.png (after the assertScreenshot -> takeScreenshot rename)
  content = content.replace(/(\s+path:\s+)([^\n]+)\.png/g, '$1$2');

  // Remove thresholdPercentage lines (not used by takeScreenshot)
  content = content.replace(/\s+thresholdPercentage:\s+\d+(\.\d+)?\n/g, '\n');

  // Preserve directory structure in temp path to avoid collisions
  const relativePath = path.relative(FLOWS_DIR, flowPath);
  const tempPath = path.join(TMP_DIR, relativePath);
  mkdirSync(path.dirname(tempPath), { recursive: true });

  // Rewrite relative runFlow paths to absolute paths so they resolve correctly
  // from the temp directory (the original relative paths are relative to flows/)
  const originalDir = path.dirname(flowPath);
  content = content.replace(
    /(-\s+runFlow:\s+)([^\n]+\.yaml)/g,
    (match, prefix, relPath) => {
      if (path.isAbsolute(relPath)) return match;
      const absPath = path.resolve(originalDir, relPath);
      return `${prefix}${absPath}`;
    },
  );

  writeFileSync(tempPath, content, 'utf-8');

  return tempPath;
}

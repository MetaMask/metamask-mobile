/* eslint-disable import-x/no-commonjs */

// Hermes dev frames look like:
//   at fnName (http://localhost:8081/index.bundle//&platform=ios&dev=true:123:45)
//   at http://localhost:8081/index.bundle//&platform=ios&dev=true:123:45
//   at fnName (address at http://localhost:8081/index.bundle:123:45)
// Native frames (`at forEach (native)`) carry no position and are skipped.
const FRAME_PATTERN = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/;

/**
 * Turn a Hermes `error.stack` string into frames Metro's `/symbolicate` accepts.
 *
 * @param {string} stack
 * @returns {{ methodName: string, file: string, lineNumber: number, column: number }[]}
 */
function parseStack(stack) {
  if (typeof stack !== 'string') return [];
  const frames = [];
  for (const line of stack.split('\n')) {
    const match = FRAME_PATTERN.exec(line);
    if (!match) continue;
    const [, methodName, file, lineNumber, column] = match;
    frames.push({
      methodName: methodName ?? '<anonymous>',
      file: file.replace(/^address at /, ''),
      lineNumber: Number(lineNumber),
      column: Number(column),
    });
  }
  return frames;
}

/**
 * Tag a symbolicated frame with where it lives so the dashboard can pick the
 * caller: the first `app` frame is the function or component that fired the call.
 *
 * @param {{ file: string, methodName: string, lineNumber: number, column: number }} frame
 * @param {string} projectRoot
 */
function classifyFrame(frame, projectRoot) {
  // Metro leaves `file` null for frames it cannot map (InternalBytecode, native).
  const file = typeof frame.file === 'string' ? frame.file : '';
  const rootPrefix = `${projectRoot}/`;
  const isInsideProject = file.startsWith(rootPrefix);
  const relative = isInsideProject ? file.slice(rootPrefix.length) : file;
  return { ...frame, file, relative, origin: getOrigin(relative) };
}

function getOrigin(relative) {
  // Still a bundle URL: Metro could not map it (bundle changed or Metro restarted).
  if (/^https?:/.test(relative)) return 'unresolved';
  if (relative.includes('networkInspector/')) return 'inspector';
  if (relative.includes('node_modules/')) return 'lib';
  if (relative.startsWith('app/') || relative === 'index.js') return 'app';
  return 'other';
}

/**
 * First app frame, else first library frame, else first non-inspector frame.
 *
 * @param {{ origin: string }[]} frames
 */
function pickCaller(frames) {
  return (
    frames.find((frame) => frame.origin === 'app') ??
    frames.find((frame) => frame.origin === 'lib') ??
    frames.find(
      (frame) => frame.origin !== 'inspector' && frame.origin !== 'unresolved',
    ) ??
    null
  );
}

module.exports = { parseStack, classifyFrame, pickCaller };

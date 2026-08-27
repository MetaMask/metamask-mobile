// React Compiler configuration + bailout logging, extracted from babel.config.js
// so the Babel config stays focused on wiring plugins together.
//
// The compiler silently skips any component it can't safely optimize (e.g. a
// Rules-of-React violation). To surface those events we attach a `logger` that
// both warns to the console and persists a structured, readable record to a
// git-ignored log file for review after the build.

// eslint-disable-next-line import-x/no-commonjs
const fs = require('fs');
// eslint-disable-next-line import-x/no-commonjs
const path = require('path');

// Toggle for logging React Compiler bailouts/failures. When false, the compiler
// keeps its quiet default behavior and no logger is attached.
const shouldLogReactCompilerFailures = process.env.REACT_COMPILER_LOG_FAILURES === 'true';

// All React Compiler bailouts are persisted to this git-ignored file so they
// can be reviewed after a build instead of scrolling through Metro's output.
const reactCompilerLogPath = path.join(__dirname, '..', 'react-compiler.log');

// Append-only logging. We deliberately do NOT truncate the file at runtime:
// Metro runs Babel transforms across multiple worker processes, each with its
// own module state, so a truncate-on-first-write would let a worker that hits
// its first bailout late wipe entries already written by its siblings. Instead
// every process writes a header once, then appends each error below it. The
// file is git-ignored — delete it to clear.
let reactCompilerLogInitialized = false;
const initReactCompilerLog = () => {
  if (reactCompilerLogInitialized) {
    return;
  }
  reactCompilerLogInitialized = true;
  const divider = '─'.repeat(80);
  const runHeader =
    `\n${divider}\n` +
    `React Compiler errors — ${new Date().toLocaleString()}\n` +
    `These components could not be optimized and were skipped by the compiler.\n` +
    `${divider}\n`;
  try {
    fs.appendFileSync(reactCompilerLogPath, runHeader);
  } catch {
    // Logging must never break a build; ignore filesystem errors.
  }
};

const appendReactCompilerLog = (filename, event) => {
  try {
    initReactCompilerLog();
    const detail = event.detail ?? event;
    const formattedDetail =
      typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2);
    const entry =
      `[${new Date().toISOString()}] ${event.kind}\n` +
      `  File:   ${filename}\n` +
      `  Detail: ${formattedDetail.replace(/\n/g, '\n          ')}\n` +
      `${'-'.repeat(80)}\n`;
    fs.appendFileSync(reactCompilerLogPath, entry);
  } catch {
    // Logging must never break a build; ignore filesystem errors.
  }
};

// React Compiler plugin options. A `logger` is only attached when logging is
// enabled so normal builds keep their quiet default behavior.
const reactCompilerOptions = shouldLogReactCompilerFailures
  ? {
      logger: {
        logEvent(filename, event) {
          if (event.kind === 'CompileError' || event.kind === 'CompileSkip') {
            appendReactCompilerLog(filename, event);
            // eslint-disable-next-line no-console
            console.warn(
              `[REACT-COMPILER] ${event.kind} in ${filename}: See ${reactCompilerLogPath} for more details.`,
            );
          }
        },
      },
    }
  : null;

// Babel can find the plugin without the `babel-plugin-` prefix.
// Ex. `babel-plugin-react-compiler` -> `react-compiler`
const reactCompilerPlugin = reactCompilerOptions
  ? ['react-compiler', reactCompilerOptions]
  : 'react-compiler';

// Don't run React Compiler in a test environment such as Jest. It's disabled
// under Jest to avoid the jest.mock hoisting conflict with the compiler-injected
// `_c` helper. Exposed as a ready-to-spread array so the Babel config doesn't
// have to know about the test-env gating at all.
const isTestEnv = process.env.NODE_ENV === 'test';
const reactCompilerBabelConfig = isTestEnv ? [] : [reactCompilerPlugin];

// eslint-disable-next-line import-x/no-commonjs
module.exports = { reactCompilerBabelConfig };

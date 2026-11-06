interface CallSite {
  getFunctionName: () => string | null;
  getFileName: () => string | null;
  getLineNumber: () => number | null;
  getColumnNumber: () => number | null;
}

type PrepareStackTrace = (error: Error, frames: CallSite[]) => string;

const StackError = Error as ErrorConstructor & {
  prepareStackTrace?: PrepareStackTrace;
};

const formatStack: PrepareStackTrace = (error, frames) =>
  [
    `${error.name}: ${error.message}`,
    ...frames.map(
      (frame) =>
        `  at ${frame.getFunctionName() ?? '<anonymous>'} (${
          frame.getFileName()?.split('/').pop() ?? '?'
        }:${frame.getLineNumber()}:${frame.getColumnNumber()})`,
    ),
  ].join('\n');

// Formats frames itself (release stacks print "[object CallSite]"); call before anything reads `error.stack`.
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const previousPrepareStackTrace = StackError.prepareStackTrace;
  StackError.prepareStackTrace = formatStack;
  try {
    return error.stack ?? `${error.name}: ${error.message}`;
  } finally {
    StackError.prepareStackTrace = previousPrepareStackTrace;
  }
}

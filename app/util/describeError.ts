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

/**
 * Describes an error with its stack, for non-production diagnostics.
 *
 * Another library's `Error.prepareStackTrace` prints release stacks as
 * "[object CallSite]", so the frames are formatted here. Stacks are formatted
 * on first read, so call this before anything else reads `error.stack`.
 *
 * @param error - The error to describe.
 * @returns The error's name, message and stack.
 */
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

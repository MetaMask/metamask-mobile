import { transformSync } from '@babel/core';
import reactCompiler from 'babel-plugin-react-compiler';
import type { CompilerFailure } from './baseline';

interface Position {
  line?: number;
  column?: number;
}

interface Location {
  start?: Position;
}

interface CompilerEventDetail {
  reason?: string;
  loc?: Location | null;
  options?: {
    reason?: string;
    loc?: Location | null;
    details?: { loc?: Location | null }[];
  };
}

interface CompilerEvent {
  kind: string;
  fnLoc?: Location | null;
  loc?: Location | null;
  reason?: string;
  data?: string;
  detail?: CompilerEventDetail;
}

const FAILURE_KINDS = new Set([
  'CompileError',
  'CompileDiagnostic',
  'PipelineError',
  'CompileSkip',
]);

export const COMPILER_OPTIONS = {
  compilationMode: 'infer',
  panicThreshold: 'none',
  noEmit: true,
  environment: { enableTreatRefLikeIdentifiersAsRefs: true },
} as const;

function eventLocation(event: CompilerEvent): Position {
  const detail = event.detail;
  return (
    detail?.options?.details?.[0]?.loc?.start ??
    detail?.options?.loc?.start ??
    detail?.loc?.start ??
    event.loc?.start ??
    event.fnLoc?.start ??
    {}
  );
}

export function toFailure(event: CompilerEvent): CompilerFailure {
  const { line = 1, column = 0 } = eventLocation(event);
  const reason =
    event.detail?.options?.reason ||
    event.detail?.reason ||
    event.reason ||
    event.data ||
    'The compiler did not provide a reason.';
  return { line, column, reason: reason.split('\n')[0] };
}

export function usesFlowParser(filePath: string): boolean {
  return /\.(?:js|jsx|mjs)$/i.test(filePath);
}

export function compileSource(
  source: string,
  filePath: string,
): CompilerFailure[] {
  const events: CompilerEvent[] = [];
  try {
    const result = transformSync(source, {
      filename: filePath,
      configFile: false,
      babelrc: false,
      compact: true,
      highlightCode: false,
      sourceType: 'module',
      parserOpts: {
        plugins: usesFlowParser(filePath)
          ? ['flow', 'jsx']
          : ['typescript', 'jsx'],
      },
      plugins: [
        [
          reactCompiler,
          {
            ...COMPILER_OPTIONS,
            logger: {
              logEvent: (_filename: string | null, event: CompilerEvent): void => {
                if (FAILURE_KINDS.has(event.kind)) {
                  events.push(event);
                }
              },
            },
          },
        ],
      ],
    });
    if (result?.code == null) {
      return [
        { line: 1, column: 0, reason: 'Babel produced no code for this file.' },
      ];
    }
  } catch (error) {
    const { loc, message } = error as {
      loc?: Position;
      message?: string;
    };
    return [
      {
        line: loc?.line ?? 1,
        column: loc?.column ?? 0,
        reason: `Babel could not transform this file: ${(
          message ?? String(error)
        )
          .split('\n')[0]
          .replace(/^[^:]*:\s*/, '')
          .replace(/\s*\(\d+:\d+\)$/, '')}`,
      },
    ];
  }
  return events
    .map(toFailure)
    .sort((a, b) => a.line - b.line || a.column - b.column);
}

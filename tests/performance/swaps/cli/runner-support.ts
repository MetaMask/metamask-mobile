const DEFAULT_METRO_PORT = 8081;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractTextForTestId(output: unknown, testId: string): string | null {
  if (Array.isArray(output)) {
    for (const value of output) {
      const text = extractTextForTestId(value, testId);
      if (text !== null) {
        return text;
      }
    }
    return null;
  }

  if (!isRecord(output)) {
    return null;
  }

  if (output.testId === testId && typeof output.text === 'string') {
    return output.text;
  }

  for (const value of Object.values(output)) {
    const text = extractTextForTestId(value, testId);
    if (text !== null) {
      return text;
    }
  }
  return null;
}

export function extractInteractionText(
  output: unknown,
  testId?: string,
): string | null {
  if (testId) {
    const targetText = extractTextForTestId(output, testId);
    if (targetText !== null) {
      return targetText;
    }
  }

  if (typeof output === 'string') {
    return output;
  }
  if (!isRecord(output)) {
    return null;
  }

  for (const key of ['text', 'value', 'result']) {
    const text = extractInteractionText(output[key]);
    if (text !== null) {
      return text;
    }
  }
  return null;
}

export function parseMetroPort(argv: string[]): number {
  const flagIndex = argv.indexOf('--metro-port');
  if (flagIndex === -1) {
    return DEFAULT_METRO_PORT;
  }

  const value = Number(argv[flagIndex + 1]);
  if (!Number.isInteger(value) || value <= 0 || value > 65_535) {
    throw new Error('--metro-port must be an integer between 1 and 65535');
  }
  return value;
}

export function buildMmSessionProbeArgs(): string[] {
  return ['describe-screen'];
}

export function formatMmSessionSetupCommand(metroPort: number): string {
  return `yarn mm launch --metro-port ${metroPort}`;
}

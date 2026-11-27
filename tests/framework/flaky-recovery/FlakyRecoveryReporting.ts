import {
  describeLocator,
  type FlakyRecoveryRecord,
  type FlakyRecoveryScreenshots,
} from './FlakyRecoveryTypes.ts';

/** Playwright annotation type that marks a test as passed through an AI recovery. */
export const FLAKY_AI_RECOVERED_ANNOTATION = 'flaky-ai-recovered';

export const FLAKY_RECORD_ATTACHMENT_PATTERN =
  /^ai-flaky-recovery-(\d+)\.json$/;

const MAX_ERROR_CHARS = 1_500;

/** The part of Playwright's `TestInfo` the reporting needs. */
export interface FlakyReportingTestInfo {
  annotations: { type: string; description?: string }[];
  attach(
    name: string,
    options: { body: string | Buffer; contentType: string },
  ): Promise<void>;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function describeFix(fix: FlakyRecoveryRecord['fix']): string {
  switch (fix.type) {
    case 'registry-dismiss':
      return `dismissed known screen "${fix.screen}" via ${describeLocator(fix.locator)}`;
    case 'dismiss-overlay':
      return `dismissed overlay via ${describeLocator(fix.locator)}`;
    case 'wait':
      return `waited ${fix.waitMs}ms`;
    case 'scroll':
      return `scrolled ${fix.direction} x${fix.times}`;
    case 'hide-keyboard':
      return 'hid the keyboard';
    case 'alternative-locator':
      return `used alternative locator ${describeLocator(fix.locator)}`;
  }
}

export function annotationDescription(record: FlakyRecoveryRecord): string {
  return `#${record.recoveryIndex} ${record.step.kind} "${truncate(record.step.intent, 120)}" recovered (${record.cause}, ${record.source}): ${truncate(record.solution, 200)}`;
}

export function renderRecoveryMarkdown(record: FlakyRecoveryRecord): string {
  const lines = [
    `# Flaky failure recovered by AI (#${record.recoveryIndex})`,
    '',
    `- **Test:** ${record.test.title} (\`${record.test.file}\`, retry ${record.test.retry})`,
    `- **Step:** ${record.step.kind} — ${record.step.intent}`,
    record.step.targetDescriptors.length > 0
      ? `- **Target:** ${record.step.targetDescriptors.join(' | ')}`
      : undefined,
    `- **Diagnosed cause:** ${record.cause}${record.source === 'registry' ? ' (known screen, no AI call)' : ''}`,
    `- **Why it failed:** ${record.reason || 'n/a'}`,
    `- **Solution applied:** ${record.solution}`,
    `- **Fix:** ${describeFix(record.fix)}`,
    `- **Recovery time:** ${record.durationMs}ms`,
    '',
    '## Original error',
    '',
    '```',
    truncate(record.originalError, MAX_ERROR_CHARS),
    '```',
    '',
    'This step passed after the fix and was retried once. Fix the root cause so the test no longer needs the recovery.',
  ];
  return lines.filter((line) => line !== undefined).join('\n');
}

/**
 * Marks the test as AI-recovered: one `flaky-ai-recovered` annotation per
 * recovery plus a JSON record, a markdown note and the before / after
 * screenshots as attachments.
 */
export async function publishFlakyRecovery(
  testInfo: FlakyReportingTestInfo,
  record: FlakyRecoveryRecord,
  screenshots: FlakyRecoveryScreenshots,
): Promise<FlakyRecoveryRecord> {
  const baseName = `ai-flaky-recovery-${record.recoveryIndex}`;
  const published: FlakyRecoveryRecord = { ...record, screenshots: {} };

  testInfo.annotations.push({
    type: FLAKY_AI_RECOVERED_ANNOTATION,
    description: annotationDescription(record),
  });

  for (const [key, base64, suffix] of [
    ['before', screenshots.beforeBase64, 'before'],
    ['after', screenshots.afterBase64, 'after'],
  ] as const) {
    if (!base64) {
      continue;
    }
    const name = `${baseName}-${suffix}.png`;
    await testInfo.attach(name, {
      body: Buffer.from(base64, 'base64'),
      contentType: 'image/png',
    });
    published.screenshots[key] = name;
  }

  await testInfo.attach(`${baseName}.json`, {
    body: JSON.stringify(published, null, 2),
    contentType: 'application/json',
  });
  await testInfo.attach(`${baseName}.md`, {
    body: renderRecoveryMarkdown(published),
    contentType: 'text/markdown',
  });
  return published;
}

/** Parses a recovery JSON attachment body; undefined when it is not a record. */
export function parseRecoveryRecord(
  body: string,
): FlakyRecoveryRecord | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      (parsed as { schemaVersion?: unknown }).schemaVersion === 1
    ) {
      return parsed as FlakyRecoveryRecord;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export interface RecoverySummaryEntry {
  record: FlakyRecoveryRecord;
  /** Playwright status of the attempt the recovery happened in. */
  status: string;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** End-of-run summary of every recovered flaky, with the solution applied. */
export function renderRunSummaryMarkdown(
  entries: RecoverySummaryEntry[],
  suite: string,
): string {
  if (entries.length === 0) {
    return '';
  }
  const aiCount = entries.filter(({ record }) => record.source === 'ai').length;
  const lines = [
    `### Flaky failures recovered by AI (${suite})`,
    '',
    `${entries.length} recovery(ies): ${aiCount} by AI, ${entries.length - aiCount} by a known screen. These tests passed, but only after a fix — treat each as a flaky test to fix at the source.`,
    '',
    '| Test | Step | Cause | Solution applied | Attempt result |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const { record, status } of entries) {
    lines.push(
      `| ${escapeTableCell(record.test.title)} | ${escapeTableCell(`${record.step.kind}: ${truncate(record.step.intent, 100)}`)} | ${record.cause} (${record.source}) | ${escapeTableCell(truncate(record.solution, 160))} | ${status} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

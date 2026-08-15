import { SwapsPerformanceArtifact } from './artifact';
import {
  findScenarioFindings,
  summarizeNetworkRequestCounts,
} from './summarize';

export function formatArtifactMarkdown(
  artifact: SwapsPerformanceArtifact,
): string {
  const findings = findScenarioFindings(artifact);
  const lines = [
    `# ${artifact.run.scenarioId} — ${artifact.run.scenarioName}`,
    '',
    artifact.run.scenarioDescription,
    '',
    `Status: **${artifact.run.status}**`,
    `Run: \`${artifact.run.id}\``,
    `Commit: \`${artifact.run.commit}\``,
    '',
    '## Phase timings',
    '',
    '| Phase | Duration | Network requests |',
    '| --- | ---: | ---: |',
  ];

  for (const phase of artifact.phases) {
    lines.push(
      `| ${phase.name} | ${phase.durationMs} ms | ${
        artifact.summary?.networkRequestsByPhase[phase.name] ?? '—'
      } |`,
    );
  }

  lines.push('', '## Render counts', '');
  const renders = Object.entries(artifact.summary?.renders ?? {});
  if (renders.length === 0) {
    lines.push('No render data captured.');
  } else {
    lines.push('| Component | Renders |', '| --- | ---: |');
    for (const [name, count] of renders) {
      lines.push(`| ${name} | ${count} |`);
    }
  }

  lines.push('', '## Network', '');
  lines.push(
    `Requests: ${artifact.summary?.networkRequests ?? 0} · Failures: ${
      artifact.summary?.failedNetworkRequests ?? 0
    } · Console errors: ${artifact.summary?.consoleErrors ?? 0}`,
  );

  lines.push('', '## Network request counts', '');
  const networkRequestCounts = summarizeNetworkRequestCounts(
    artifact.capture?.network ?? [],
  );
  if (networkRequestCounts.length === 0) {
    lines.push('No network requests captured.');
  } else {
    lines.push('| Request | RPC method | Calls |', '| --- | --- | ---: |');
    for (const entry of networkRequestCounts) {
      lines.push(
        `| ${entry.method} ${entry.host}${entry.path} | ${
          entry.rpcMethod ?? '—'
        } | ${entry.count} |`,
      );
    }
  }

  lines.push('', '## Findings', '');
  for (const finding of findings) {
    lines.push(`- **${finding.severity.toUpperCase()}** — ${finding.message}`);
  }

  const slowestRequests = artifact.summary?.slowestNetworkRequests ?? [];
  if (slowestRequests.length > 0) {
    lines.push(
      '',
      '## Slowest network requests',
      '',
      '| Request | Status | Duration |',
      '| --- | ---: | ---: |',
    );
    for (const entry of slowestRequests) {
      lines.push(
        `| ${entry.method} ${entry.host}${entry.path} | ${
          entry.status ?? entry.error ?? '—'
        } | ${entry.durationMs ?? '—'} ms |`,
      );
    }
  }

  if (artifact.failure) {
    lines.push('', '## Failure', '', artifact.failure);
  }

  return `${lines.join('\n')}\n`;
}

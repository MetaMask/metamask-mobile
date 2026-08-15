import { RangeStatistics, SwapsPerformanceComparison } from './comparison';

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function rangeCells(statistics: RangeStatistics, suffix = ''): string {
  return [statistics.min, statistics.median, statistics.max, statistics.range]
    .map((value) => `${formatNumber(value)}${suffix}`)
    .join(' | ');
}

export function formatComparisonMarkdown(
  comparison: SwapsPerformanceComparison,
): string {
  const firstRun = comparison.runs[0];
  const lastRun = comparison.runs[comparison.runs.length - 1];
  const lines = [
    `# ${comparison.scenario.id} — Within-commit comparison`,
    '',
    comparison.scenario.name,
    '',
    comparison.scenario.description,
    '',
    `Commit: \`${comparison.commit}\``,
    `Platform: \`${comparison.platform}\``,
    `Runs: ${comparison.runs.length} total · ${comparison.successfulRuns.length} successful · ${comparison.failedRuns.length} failed`,
    `Window: ${firstRun.run.createdAt} to ${lastRun.run.createdAt}`,
    '',
    '> These results assume every run used a clean working tree at the recorded commit. Working-tree fingerprints are not captured yet.',
    '',
    '## Phase duration ranges',
    '',
    '| Phase | Min | Median | Max | Range |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const phase of comparison.phaseDurations) {
    lines.push(
      `| ${formatCell(phase.name)} | ${rangeCells(phase.statistics, ' ms')} |`,
    );
  }
  lines.push(
    `| **Total measured phases** | ${rangeCells(
      comparison.totalPhaseDuration,
      ' ms',
    )} |`,
    '',
    'Total measured phase duration is the sum of persisted phase durations; gaps between phases are excluded.',
    '',
    '## Render-count ranges',
    '',
  );

  if (comparison.renders.length === 0) {
    lines.push('No render data was captured in the successful runs.');
  } else {
    lines.push(
      '| Component | Runs observed | Min | Median | Max | Range |',
      '| --- | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const render of comparison.renders) {
      lines.push(
        `| ${formatCell(render.name)} | ${render.runsObserved}/${
          comparison.successfulRuns.length
        } | ${rangeCells(render.statistics)} |`,
      );
    }
  }

  lines.push(
    '',
    '## Run-level diagnostic ranges',
    '',
    '| Metric | Min | Median | Max | Range |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Network requests | ${rangeCells(comparison.networkRequests)} |`,
    `| Failed network requests | ${rangeCells(
      comparison.failedNetworkRequests,
    )} |`,
    `| Console errors | ${rangeCells(comparison.consoleErrors)} |`,
    '',
    '## Network requests by phase',
    '',
    '| Phase | Min | Median | Max | Range |',
    '| --- | ---: | ---: | ---: | ---: |',
  );
  for (const phase of comparison.networkRequestsByPhase) {
    lines.push(
      `| ${formatCell(phase.name)} | ${rangeCells(phase.statistics)} |`,
    );
  }

  lines.push('', '## Network request groups', '');
  if (comparison.requestGroups.length === 0) {
    lines.push('No network requests were captured in the successful runs.');
  } else {
    lines.push(
      '| Request | RPC method | Runs observed | Total calls | Calls/run min | Calls/run median | Calls/run max | Calls/run range | Duration samples | Duration min | Duration median | Duration max |',
      '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    );
    for (const request of comparison.requestGroups) {
      const duration = request.durationMs;
      lines.push(
        `| ${formatCell(`${request.method} ${request.host}${request.path}`)} | ${
          request.rpcMethod ? formatCell(request.rpcMethod) : '—'
        } | ${request.runsObserved}/${comparison.successfulRuns.length} | ${
          request.totalCalls
        } | ${formatNumber(request.callsPerRun.min)} | ${formatNumber(
          request.callsPerRun.median,
        )} | ${formatNumber(request.callsPerRun.max)} | ${formatNumber(
          request.callsPerRun.range,
        )} | ${duration?.samples ?? 0} | ${
          duration ? `${formatNumber(duration.min)} ms` : '—'
        } | ${duration ? `${formatNumber(duration.median)} ms` : '—'} | ${
          duration ? `${formatNumber(duration.max)} ms` : '—'
        } |`,
      );
    }
  }

  lines.push('', '## Findings', '');
  for (const finding of comparison.findings) {
    lines.push(`- **${finding.severity.toUpperCase()}** — ${finding.message}`);
  }

  lines.push('', '## Preconditions', '', '| Name | Value |', '| --- | --- |');
  for (const [name, value] of Object.entries(comparison.preconditions).sort(
    ([first], [second]) => first.localeCompare(second),
  )) {
    lines.push(`| ${formatCell(name)} | ${formatCell(String(value))} |`);
  }

  const phaseNames = comparison.phaseDurations.map((phase) => phase.name);
  lines.push(
    '',
    '## Individual runs',
    '',
    `| Run | Created at | Status | ${phaseNames
      .map((name) => `${formatCell(name)} duration`)
      .join(
        ' | ',
      )} | Total measured duration | Requests | Failures | Console errors |`,
    `| --- | --- | --- | ${phaseNames.map(() => '---:').join(' | ')} | ---: | ---: | ---: | ---: |`,
  );
  for (const artifact of comparison.runs) {
    const durations = phaseNames.map((name) => {
      const phase = artifact.phases.find((entry) => entry.name === name);
      return phase ? `${formatNumber(phase.durationMs)} ms` : '—';
    });
    const totalDuration = artifact.phases.reduce(
      (total, phase) => total + phase.durationMs,
      0,
    );
    lines.push(
      `| \`${formatCell(artifact.run.id)}\` | ${artifact.run.createdAt} | ${
        artifact.run.status
      } | ${durations.join(' | ')} | ${
        artifact.phases.length > 0 ? `${formatNumber(totalDuration)} ms` : '—'
      } | ${artifact.summary?.networkRequests ?? '—'} | ${
        artifact.summary?.failedNetworkRequests ?? '—'
      } | ${artifact.summary?.consoleErrors ?? '—'} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

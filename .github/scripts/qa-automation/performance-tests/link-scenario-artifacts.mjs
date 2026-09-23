#!/usr/bin/env node

/**
 * Rewrites a profiling digest so every scenario name it mentions becomes the
 * download link for that scenario's Hermes profiles.
 *
 * The analyzer cannot do this itself: artifact ids only exist once the
 * per-scenario uploads have finished, which is a later job.
 *
 * Usage:
 *   node link-scenario-artifacts.mjs <input.md> <output.md> \
 *     [--style slack|markdown] [--optional]
 *
 * `--optional` copies the digest unchanged when no scenario artifact is
 * published yet, so a run page still shows its report.
 *
 * Environment:
 *   GITHUB_TOKEN       required, needs actions:read
 *   GITHUB_REPOSITORY  required
 *   GITHUB_RUN_ID      run that holds the per-scenario artifacts
 */

import fs from 'fs';
import path from 'path';

const SCENARIO_ARTIFACT_PREFIX = 'hermes-profile-';
// Mirrors the ownership tags on tests/performance/**/*.spec.ts. Slack group
// ids come from tests/scripts/weekly-app-profiling-report.mjs, plus Earn's id
// documented in tests/teams-config.js.
const SCENARIO_TEAMS = [
  {
    pattern: /\bPerps\b/i,
    handle: 'mm-perps-engineering-team',
    id: 'S094DMAQNCV',
  },
  { pattern: /\bPredict\b/i, handle: 'team-predict', id: 'S095BEYMASG' },
  {
    pattern: /(?:Cross-chain swap|Swap flow)/i,
    handle: 'swap-bridge-dev-team',
    id: 'S04NGHK3U9Z',
  },
  {
    pattern: /(?:Asset View|Aggregated Balance)/i,
    handle: 'assets-dev-team',
    id: 'S09C9U4K953',
  },
  { pattern: /\bMoney Home\b/i, handle: 'mm-earn-team', id: 'S052NJFKX6Y' },
  {
    pattern: /^Import SRP with/i,
    handle: 'accounts-team',
    id: 'S05NSFC03GF',
  },
  {
    pattern:
      /(?:Account creation after fresh install|Fresh SRP wallet creation|Onboarding Import SRP|Seedless Onboarding)/i,
    handle: 'metamask-onboarding-team',
    id: 'S090QC71NQ2',
  },
  {
    pattern: /(?:Cold Start|Measure Warm Start)/i,
    handle: 'metamask-mobile-platform',
    id: 'S04EF225J1M',
  },
  // The Rewards scenario is currently tagged @performance-team, which has no
  // Slack group id in tests/teams-config.js. Keep the owner visible without
  // pretending this plain-text fallback will notify a Slack user group.
  {
    pattern: /Rewards tab time-to-content/i,
    handle: 'performance-team',
    id: null,
  },
];

function scenarioTeam(scenario) {
  return (
    SCENARIO_TEAMS.find(({ pattern }) => pattern.test(scenario)) || {
      handle: 'performance-team',
      id: null,
    }
  );
}

function slackTeamOwnerLabel(scenario) {
  const team = scenarioTeam(scenario);
  return `owner ${team.handle}`;
}

function parseArgs(argv) {
  const positional = argv.filter((value) => !value.startsWith('--'));
  const flags = new Set(argv.filter((value) => value.startsWith('--')));
  const styleIndex = argv.indexOf('--style');
  return {
    input: positional[0],
    output: positional[1] || positional[0],
    style: styleIndex === -1 ? 'slack' : argv[styleIndex + 1],
    optional: flags.has('--optional'),
  };
}

async function listRunArtifacts(repo, runId, token, { fetchFn = fetch } = {}) {
  const response = await fetchFn(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub artifacts HTTP ${response.status}`);
  }
  const payload = await response.json();
  return payload.artifacts || [];
}

/**
 * Pairs each scenario with its uploaded artifact. Longest names are replaced
 * first so a scenario whose title contains another one keeps its own link.
 */
function scenarioDownloadMap(artifacts, manifest, repo, runId) {
  const byName = new Map(
    artifacts
      .filter(
        (artifact) =>
          !artifact.expired &&
          String(artifact.name || '').startsWith(SCENARIO_ARTIFACT_PREFIX),
      )
      .map((artifact) => [artifact.name, artifact]),
  );
  return (manifest?.include || [])
    .map((item) => {
      const artifact = byName.get(item.artifactName);
      if (!artifact || !item.scenario) {
        return null;
      }
      return {
        scenario: item.scenario,
        url: `https://github.com/${repo}/actions/runs/${runId}/artifacts/${artifact.id}`,
        ownerLabel: slackTeamOwnerLabel(item.scenario),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.scenario.length - left.scenario.length);
}

function formatLink(scenario, url, ownerLabel, style) {
  if (style === 'markdown') {
    return `[${scenario}](${url})`;
  }
  return ownerLabel
    ? `<${url}|${scenario}> · ${ownerLabel}`
    : `<${url}|${scenario}>`;
}

// Existing links are kept intact so a second pass cannot nest one link inside
// another.
const EXISTING_LINK = /(<https?:\/\/[^>|]+\|[^>]+>|\[[^\]]+\]\(https?:\/\/[^)]+\))/;
const SLACK_HEADING = /^\*([^*]+)\*$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linkLine(line, mappings, style, withOwnerLabels) {
  let text = line;
  for (const { scenario, url, ownerLabel } of mappings) {
    const linked = formatLink(
      scenario,
      url,
      withOwnerLabels ? ownerLabel : null,
      style,
    );
    const escaped = escapeRegExp(scenario);
    // Bold and plain spellings are matched in one pass, otherwise the second
    // replacement would run over the link the first one just inserted.
    const occurrence = new RegExp(`\\*${escaped}\\*|${escaped}`, 'g');
    text = text
      .split(EXISTING_LINK)
      .map((part, index) =>
        index % 2 === 1 ? part : part.replace(occurrence, linked),
      )
      .join('');
  }
  return text;
}

/**
 * Links every scenario name and owns the digest section where the team is
 * named. Repeating a team under each conclusion put every owner at the top of
 * the message, so ownership is stated once per outlier instead.
 */
function linkScenarioNames(
  markdown,
  mappings,
  { style = 'slack', mentionSection = 'Outliers' } = {},
) {
  let section = null;
  return String(markdown || '')
    .split('\n')
    .map((line) => {
      const heading = line.match(SLACK_HEADING);
      if (heading) {
        section = heading[1];
        return line;
      }
      return linkLine(
        line,
        mappings,
        style,
        style !== 'markdown' && section === mentionSection,
      );
    })
    .join('\n');
}

function readManifest(inputPath) {
  const manifestPath = path.join(
    path.dirname(inputPath),
    'scenario-artifacts.json',
  );
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('❌ Usage: link-scenario-artifacts.mjs <input.md> [output.md]');
    process.exit(1);
  }

  const markdown = fs.readFileSync(args.input, 'utf8');
  const mappings = scenarioDownloadMap(
    await listRunArtifacts(
      process.env.GITHUB_REPOSITORY,
      process.env.GITHUB_RUN_ID,
      process.env.GITHUB_TOKEN,
    ),
    readManifest(args.input),
    process.env.GITHUB_REPOSITORY,
    process.env.GITHUB_RUN_ID,
  );

  if (mappings.length === 0) {
    if (!args.optional) {
      console.error('❌ No per-scenario Hermes profile artifacts were published');
      process.exit(1);
    }
    fs.writeFileSync(args.output, markdown);
    console.log('ℹ️ No scenario artifacts found; digest left unlinked');
    return;
  }

  fs.writeFileSync(
    args.output,
    linkScenarioNames(markdown, mappings, { style: args.style }),
  );
  console.log(`🔗 Linked ${mappings.length} scenario downloads (${args.style})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  parseArgs,
  listRunArtifacts,
  scenarioDownloadMap,
  scenarioTeam,
  slackTeamOwnerLabel,
  linkScenarioNames,
  readManifest,
};

/**
 * Jev API client for smart-e2e domain classification and tag augmentation.
 *
 * Uses the TypeSafe AI System One model to:
 * 1. Classify which MetaMask product domains a PR touches (pre-classifier)
 * 2. Identify additional E2E/performance tags beyond a hard-rule seed (augmentation)
 *
 * All exported functions return safe defaults on error — never throw.
 */

import { TypeSafeClient, noul } from '@typesafe-ai/sdk';

const DOMAIN_THRESHOLD = 0.75;
const TAG_THRESHOLD = 0.8;

const DOMAINS = {
  wallet:
    'Changes affect wallet creation, import, backup, or Secret Recovery Phrase (SRP) key management flows',
  send: 'Changes affect sending or transferring tokens, ETH, or other assets to another address',
  network:
    'Changes affect network switching, RPC configuration, chain management, or multi-chain provider routing',
  defi: 'Changes affect swaps, bridge flows, staking, lending, perpetuals, prediction markets, or other DeFi integrations',
  browser:
    'Changes affect the in-app dapp browser, WebView, WalletConnect, or dApp connection flows',
  accounts:
    'Changes affect account management, multi-account, account selector, or identity/profile sync',
  settings:
    'Changes affect app settings, security settings, permissions, biometrics, or app configuration',
  snaps:
    'Changes affect the MetaMask Snaps platform, snap lifecycle, snap APIs, or preinstalled snaps',
  confirmations:
    'Changes affect the transaction or signature confirmation UI, gas fee UI, or Blockaid security alerts',
  onboarding:
    'Changes affect the onboarding flow, seedless/social login, wallet creation screens, or first-time user experience',
} as const;

type DomainKey = keyof typeof DOMAINS;

export type CatalogEntry = { id: string; description: string };

let _client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (!_client) {
    _client = new TypeSafeClient();
  }
  return _client;
}

function buildState(files: string[], diffSnippet: string): string {
  const fileList = files.slice(0, 150).join('\n');
  return [
    'CHANGED FILES:',
    fileList,
    '',
    'DIFF SUMMARY:',
    diffSnippet.slice(0, 3000),
  ].join('\n');
}

/**
 * Classify which MetaMask product domains the PR touches.
 * Returns a formatted hint string for injection into the task prompt,
 * or '' if no domain clears the confidence threshold.
 */
export async function classifyDomains(
  files: string[],
  diffSnippet: string,
): Promise<string> {
  const client = getClient();
  const state = buildState(files, diffSnippet);

  const questions = Object.fromEntries(
    Object.entries(DOMAINS).map(([key, instructions]) => [
      key,
      noul(instructions),
    ]),
  ) as Record<DomainKey, ReturnType<typeof noul>>;

  const response = await client.systemOne({
    model: 'jev-latest',
    state,
    questions,
  });

  const detected: string[] = [];
  for (const [domain, answer] of Object.entries(response.answers) as [
    DomainKey,
    { noul: number },
  ][]) {
    if (answer.noul >= DOMAIN_THRESHOLD) {
      detected.push(`${capitalize(domain)} (${answer.noul.toFixed(2)})`);
    }
  }

  if (detected.length === 0) return '';
  return (
    `Jev domain signals (confidence ≥ ${DOMAIN_THRESHOLD}): ${detected.join(', ')}.\n` +
    `Focus catalog analysis on tags related to these flows first.`
  );
}

/**
 * Given a set of already-selected seed tags, identify additional catalog tags
 * that Jev believes should also run. Returns only tags above the confidence
 * threshold that are not already in seedTags.
 */
export async function augmentTags(
  files: string[],
  diffSnippet: string,
  seedTags: string[],
  catalog: CatalogEntry[],
): Promise<string[]> {
  const client = getClient();
  const seedSet = new Set(seedTags);

  const candidates = catalog.filter((entry) => !seedSet.has(entry.id));
  if (candidates.length === 0) return [];

  const state = [
    buildState(files, diffSnippet),
    '',
    `ALREADY SELECTED TAGS: ${seedTags.join(', ') || 'none'}`,
  ].join('\n');

  const questions = Object.fromEntries(
    candidates.map((entry) => [
      entry.id,
      noul(
        `Should the ${entry.id} test suite run? Context: ${entry.description.slice(0, 300)}`,
      ),
    ]),
  );

  const response = await client.systemOne({
    model: 'jev-latest',
    state,
    questions,
  });

  return candidates
    .filter((entry) => {
      const answer = response.answers[entry.id] as { noul: number } | undefined;
      return answer !== undefined && answer.noul >= TAG_THRESHOLD;
    })
    .map((entry) => entry.id);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

import { test as perfTest } from '../../framework/fixtures/playwright';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightMatchers,
} from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import { Performance, PerformanceLogin } from '../../tags.performance.js';
import { UNLOCK_NETWORK_METER_SUMMARY_TEST_ID } from '../../../app/core/UnlockNetworkMeter';

/**
 * Real-network unlock HTTP budget (zero Mockttp).
 *
 * Reads the same in-app UnlockNetworkMeter summary exposed on Homepage via
 * accessibility after unlock → homepage quiescence.
 */

interface UnlockApiCallBudget {
  flow: string;
  totalMax: number;
  hosts: Record<string, number>;
}

interface UnlockMeterAccessibilitySummary {
  total: number;
  byHost: Record<string, number>;
  endReason: string;
}

const BUDGET_PATH = path.resolve(
  process.cwd(),
  'tests/performance/budgets/wallet-unlock-api-calls.json',
);

function loadBudget(): UnlockApiCallBudget {
  const raw = fs.readFileSync(BUDGET_PATH, 'utf8');
  return JSON.parse(raw) as UnlockApiCallBudget;
}

function assertUnlockHttpBudget(
  summary: UnlockMeterAccessibilitySummary,
  budget: UnlockApiCallBudget,
): void {
  const failures: string[] = [];

  if (summary.total > budget.totalMax) {
    failures.push(
      `total ${String(summary.total)} exceeds totalMax ${String(budget.totalMax)}`,
    );
  }

  const budgetHosts = Object.keys(budget.hosts);
  if (budgetHosts.length > 0) {
    for (const [host, count] of Object.entries(summary.byHost)) {
      if (!(host in budget.hosts)) {
        failures.push(
          `unknown host "${host}" with ${String(count)} request(s)`,
        );
        continue;
      }
      const ceiling = budget.hosts[host] ?? 0;
      if (count > ceiling) {
        failures.push(
          `host "${host}" count ${String(count)} exceeds ceiling ${String(ceiling)}`,
        );
      }
    }
  }

  if (failures.length === 0) {
    return;
  }

  throw new Error(
    [
      'Unlock HTTP call budget exceeded (in-app meter, real network):',
      ...failures.map((line) => `  - ${line}`),
      `summary: ${JSON.stringify(summary)}`,
    ].join('\n'),
  );
}

async function readUnlockMeterSummaryFromProbe(): Promise<UnlockMeterAccessibilitySummary> {
  const probe = await PlaywrightMatchers.getElementById(
    UNLOCK_NETWORK_METER_SUMMARY_TEST_ID,
    {
      exact: false,
    },
  );

  await PlaywrightAssertions.expectElementToBeVisible(probe, {
    description: 'Unlock network meter summary probe should be present',
    timeout: 60_000,
  });

  const raw = probe.unwrap();
  const isAndroid = await PlatformDetector.isAndroid();
  const label = isAndroid
    ? ((await raw.getAttribute('content-desc')) ?? '')
    : ((await raw.getAttribute('label')) ??
      (await raw.getAttribute('name')) ??
      '');

  // Labels can be joined with unrelated text by the assertion helper pattern;
  // parse the first JSON object found.
  const jsonStart = label.indexOf('{');
  const jsonEnd = label.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error(
      `Unlock meter probe accessibility label was not JSON: "${label}"`,
    );
  }

  return JSON.parse(
    label.slice(jsonStart, jsonEnd + 1),
  ) as UnlockMeterAccessibilitySummary;
}

perfTest.describe(`${Performance} ${PerformanceLogin}`, () => {
  perfTest(
    'keeps unlock→homepage HTTP calls within the real-network in-app budget',
    { tag: '@metamask-mobile-platform' },
    async () => {
      await loginToAppPlaywright();
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(WalletView.totalBalance),
        {
          description: 'Wallet should be visible after unlock',
          timeout: 30_000,
        },
      );

      const summary = await readUnlockMeterSummaryFromProbe();
      const budget = loadBudget();
      assertUnlockHttpBudget(summary, budget);

      console.log(
        `Unlock HTTP meter: total=${String(summary.total)} endReason=${summary.endReason}`,
      );
    },
  );
});

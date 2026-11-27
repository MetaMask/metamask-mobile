/* eslint-disable import-x/no-nodejs-modules -- reads the scenario markdown next to this test */
import fs from 'fs';
import path from 'path';
import { TokenOverviewSelectorsIDs } from '../../../app/components/UI/AssetOverview/TokenOverview.testIds';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { QuoteViewSelectorIDs } from '../../selectors/Bridge/QuoteView.selectors';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import { parseScenario } from './scenario';
import {
  KEYPAD_HINTS,
  resolveScenarioHints,
  type HintCatalog,
} from './scenarioHints';

const strings = (source: Record<string, unknown>): string[] =>
  Object.values(source).filter(
    (value): value is string => typeof value === 'string',
  );

const digits = [...'0123456789'].map((digit) => `keypad-key-${digit}`);

describe('resolveScenarioHints', () => {
  const catalog: HintCatalog = {
    modules: {
      Demo: { ID: 'demo-id', title: (name: string) => `title-${name}` },
    },
    groups: { keypad: ['keypad-key-0'] },
  };

  it('spreads a module, calls a member, expands a group, and keeps literals', () => {
    expect(
      resolveScenarioHints(
        ['Demo', 'Demo.title("tokens")', 'keypad', 'asset-ETH'],
        catalog,
      ),
    ).toEqual(['demo-id', 'title-tokens', 'keypad-key-0', 'asset-ETH']);
  });

  it('rejects a module name that is not in the catalog', () => {
    expect(() => resolveScenarioHints(['MissingModule'], catalog)).toThrow(
      'Unknown hint "MissingModule"',
    );
  });

  it('resolves the login scenarios to the same ids the specs used to pass', () => {
    const expected: Record<string, string[]> = {
      'asset-balances.scenario.md': strings(WalletViewSelectorsIDs),
      'asset-view.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('tokens'),
        'asset-ETH',
        ...strings(TokenOverviewSelectorsIDs),
      ],
      'cold-start-to-login.scenario.md': strings(WalletViewSelectorsIDs),
      'cross-chain-swap-flow.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        ...strings(QuoteViewSelectorIDs),
        ...KEYPAD_HINTS,
      ],
      'eth-swap-flow.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        ...strings(QuoteViewSelectorIDs),
        ...digits,
        'keypad-key-dot',
      ],
      'import-multiple-srps.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        'account-hub-add-wallet-button',
        'account-list-add-account-button',
        'add-account-srp-account',
      ],
      'perps-add-funds.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('perps'),
        'perps-tutorial-skip-button',
        'custom-amount-input',
        ...KEYPAD_HINTS,
      ],
      'predict-available-balance.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        'homepage-section-title-predictions',
        'predict-home-container',
      ],
      'predict-deposit.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        'homepage-section-title-predictions',
        'predict-home-container',
        'predict-portfolio-action-add-funds',
        'custom-amount-input',
        'custom-amount-input-value',
        ...KEYPAD_HINTS,
      ],
      'predict-market-details.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        'homepage-section-title-predictions',
        'predict-home-container',
        'predict-home-scroll-view',
        'predict-home-categories-tile-politics',
        'predict-feed-view-container',
        'predict-feed-view-market-list',
        'predict-feed-view-market-card-1',
        'predict-market-details-tab-bar-tab-about',
      ],
      'rewards-tab-time-to-content.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        'tab-bar-item-Rewards',
      ],
      'send-eth-between-accounts.scenario.md': [
        ...strings(WalletViewSelectorsIDs),
        ...strings(RedesignedSendViewSelectorsIDs),
        ...strings(SendActionViewSelectorsIDs),
        'asset-ETH',
        ...KEYPAD_HINTS,
      ],
      'uniswap-interaction.scenario.md': [],
      'warm-start-login-to-wallet.scenario.md': strings(WalletViewSelectorsIDs),
      'warm-start-to-login.scenario.md': strings(WalletViewSelectorsIDs),
    };
    const dir = path.resolve(__dirname, '../../performance/login/scenarios');
    for (const [file, hints] of Object.entries(expected)) {
      const scenario = parseScenario(
        fs.readFileSync(path.join(dir, file), 'utf8'),
      );
      expect(resolveScenarioHints(scenario.hints)).toEqual(hints);
    }
  });
});

import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';
import { safeToChecksumAddress } from '../../../../util/address';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { useMoneyTransactionDisplayInfo } from './useMoneyTransactionDisplayInfo';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: (chainId: string) => {
    // Return a well-known address only for mainnet so we can control which
    // tokens are treated as native in tests.
    if (chainId === '0x1') return '0x0000000000000000000000000000000000000000';
    throw new Error(`unknown chainId ${chainId}`);
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHAIN_ID: Hex = '0x1';
const USDC_ADDRESS: Hex = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
// ETH native address on mainnet
const ETH_ADDRESS: Hex = '0x0000000000000000000000000000000000000000';

function makeState(
  overrides: {
    currentCurrency?: string;
    currencyRates?: Record<
      string,
      { conversionRate?: number; usdConversionRate?: number }
    >;
    tokenMarketData?: Record<string, unknown>;
    tokens?: TransactionMeta[];
  } = {},
): ProviderValues['state'] {
  return {
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: overrides.currentCurrency ?? 'usd',
          currencyRates: overrides.currencyRates ?? {},
        },
        TokenRatesController: {
          marketData: overrides.tokenMarketData ?? {},
        },
        TokensController: {
          allTokens: {},
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            [CHAIN_ID]: { nativeCurrency: 'ETH' },
          },
        },
      },
    },
  } as unknown as ProviderValues['state'];
}

function makeTx(
  type: TransactionType,
  extra: Record<string, unknown> = {},
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: CHAIN_ID,
    type,
    ...extra,
  } as unknown as TransactionMeta;
}

// ---------------------------------------------------------------------------
// Label — titleKeyToLabel exhaustive coverage
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — titleKeyToLabel all keys', () => {
  const cases: [string, string][] = [
    ['added', 'money.transaction.added'],
    ['deposited', 'money.transaction.deposited'],
    ['received', 'money.transaction.received'],
    ['card_transaction', 'money.transaction.card_transaction'],
    ['converted', 'money.transaction.converted'],
    ['sent', 'money.transaction.sent'],
    ['transferred', 'money.transaction.transferred'],
    // unknown key hits the default branch → 'received'
    ['unknown_key_xyz', 'money.transaction.received'],
  ];

  it.each(cases)(
    'moneyActivityTitleKey "%s" produces label "%s"',
    (key, expected) => {
      const tx = makeTx(TransactionType.moneyAccountDeposit, {
        moneyActivityTitleKey: key,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyTransactionDisplayInfo(tx, undefined),
        { state: makeState() },
      );
      expect(result.current.label).toBe(expected);
    },
  );
});

// ---------------------------------------------------------------------------
// Label — getLabelForTransactionType exhaustive coverage
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — getLabelForTransactionType', () => {
  it('returns deposited when type is undefined', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, { type: undefined });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('returns deposited for moneyAccountDeposit type', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('returns deposited for incoming type', () => {
    const tx = makeTx(TransactionType.incoming);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('returns sent for moneyAccountWithdraw type', () => {
    const tx = makeTx(TransactionType.moneyAccountWithdraw);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.sent');
  });

  it('returns sent for simpleSend type', () => {
    const tx = makeTx(TransactionType.simpleSend);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.sent');
  });

  it('returns converted for musdConversion type', () => {
    const tx = makeTx(TransactionType.musdConversion);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.converted');
  });

  it('returns received (default) for unrecognised type', () => {
    const tx = makeTx(TransactionType.swap);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.received');
  });

  it('derives label from nested type for an EIP-7702 batch deposit', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('derives label from nested type for an EIP-7702 batch withdraw', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.sent');
  });

  it('returns received for a batch tx with no money-type nested transaction', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.swap }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    // batch with no money nested type hits getLabelForTransactionType(batch) → default → 'received'
    expect(result.current.label).toBe('money.transaction.received');
  });
});

// ---------------------------------------------------------------------------
// Icon — titleKeyToIcon exhaustive coverage
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — titleKeyToIcon all keys', () => {
  const cases: [string, IconName][] = [
    ['added', IconName.Add],
    ['deposited', IconName.Add],
    ['received', IconName.Arrow2Down],
    ['card_transaction', IconName.Card],
    ['converted', IconName.Refresh],
    ['sent', IconName.Arrow2UpRight],
    ['transferred', IconName.SwapHorizontal],
    // unknown key → default → Arrow2Down
    ['unknown_key_xyz', IconName.Arrow2Down],
  ];

  it.each(cases)(
    'moneyActivityTitleKey "%s" produces icon %s',
    (key, expected) => {
      const tx = makeTx(TransactionType.moneyAccountDeposit, {
        moneyActivityTitleKey: key,
      });
      const { result } = renderHookWithProvider(
        () => useMoneyTransactionDisplayInfo(tx, undefined),
        { state: makeState() },
      );
      expect(result.current.icon).toBe(expected);
    },
  );
});

// ---------------------------------------------------------------------------
// Icon — getIconForTransactionType exhaustive coverage
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — getIconForTransactionType', () => {
  it('returns Arrow2Down when type is undefined', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, { type: undefined });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2Down);
  });

  it('returns Add for moneyAccountDeposit type', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Add);
  });

  it('returns Arrow2Down for incoming type', () => {
    const tx = makeTx(TransactionType.incoming);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2Down);
  });

  it('returns Refresh for musdConversion type', () => {
    const tx = makeTx(TransactionType.musdConversion);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Refresh);
  });

  it('returns SwapHorizontal for moneyAccountWithdraw type', () => {
    const tx = makeTx(TransactionType.moneyAccountWithdraw);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.SwapHorizontal);
  });

  it('returns Arrow2UpRight for simpleSend type', () => {
    const tx = makeTx(TransactionType.simpleSend);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2UpRight);
  });

  it('returns Arrow2Down (default) for unrecognised type', () => {
    const tx = makeTx(TransactionType.swap);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2Down);
  });

  it('returns Add for a batch tx with a nested moneyAccountDeposit', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Add);
  });

  it('returns SwapHorizontal for a batch tx with a nested moneyAccountWithdraw', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.SwapHorizontal);
  });
});

// ---------------------------------------------------------------------------
// Primary amount — ERC-20 (USDC)
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — ERC-20 primary amount', () => {
  it('formats USDC requiredAssets amount as +X.XX USDC', () => {
    // 1_000_000 minimal units = 1.00 USDC (6 decimals)
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: USDC_ADDRESS, amount: '1000000' }],
    });

    // Provide the token in state so it looks like an ERC-20 (not native).
    const stateWithUsdc = {
      engine: {
        backgroundState: {
          CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
          TokenRatesController: { marketData: {} },
          TokensController: {
            allTokens: {
              [CHAIN_ID]: {
                '0xSomeWallet': [
                  {
                    address: USDC_ADDRESS,
                    symbol: 'USDC',
                    decimals: 6,
                    image: undefined,
                  },
                ],
              },
            },
          },
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID]: { nativeCurrency: 'ETH' },
            },
          },
        },
      },
    } as unknown as ProviderValues['state'];

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: stateWithUsdc },
    );
    expect(result.current.primaryAmount).toBe('+1.00 USDC');
  });
});

// ---------------------------------------------------------------------------
// Primary amount — native token (ETH)
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — native token (ETH) primary amount', () => {
  /**
   * requiredAssets[0].amount is stored as a 6-decimal USDC-equivalent
   * (i.e. the USD value of the deposit).  Given amount=998537 ($0.998537)
   * and ETH/USD rate=2242, the expected ETH amount is
   * 0.998537 / 2242 ≈ 0.000445 ETH (rounded down to 6dp).
   *
   * Note: the code must use usdConversionRate (ETH→USD), not conversionRate
   * (ETH→currentCurrency), because requiredAsset.amount is always in USD units.
   */
  it('converts 6-decimal USD amount to ETH via usdConversionRate', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: ETH_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: ETH_ADDRESS, amount: '998537' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      {
        state: makeState({
          currencyRates: { ETH: { usdConversionRate: 2242 } },
        }),
      },
    );

    // 0.998537 / 2242 = 0.00044538... → toFixed(6, ROUND_DOWN) = "0.000445"
    expect(result.current.primaryAmount).toBe('+0.000445 ETH');
  });

  it('uses usdConversionRate not conversionRate — correct result in non-USD currency', () => {
    // currentCurrency = EUR; ETH/EUR = 2000, ETH/USD = 2242
    // requiredAsset.amount = 998537 (= $0.998537 USD)
    // Correct:   0.998537 / 2242 ≈ 0.000445 ETH  (uses usdConversionRate)
    // Incorrect: 0.998537 / 2000 ≈ 0.000499 ETH  (would use conversionRate)
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: ETH_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: ETH_ADDRESS, amount: '998537' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      {
        state: makeState({
          currentCurrency: 'eur',
          currencyRates: {
            ETH: { conversionRate: 2000, usdConversionRate: 2242 },
          },
        }),
      },
    );

    expect(result.current.primaryAmount).toBe('+0.000445 ETH');
  });

  it('leaves primaryAmount empty when exchange rate is unavailable', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: ETH_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: ETH_ADDRESS, amount: '998537' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState({ currencyRates: {} }) },
    );

    expect(result.current.primaryAmount).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Fiat amount fallback
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — fiat amount fallback', () => {
  it('falls back to metamaskPay.targetFiat when no market-rate value is available', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { targetFiat: 1.5 },
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState({ currentCurrency: 'usd' }) },
    );

    // moneyFormatFiat formats to a currency string; we just confirm it's non-empty and positive
    expect(result.current.fiatAmount).toBeTruthy();
    expect(result.current.fiatAmount.startsWith('+')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Token resolution — catch branch and no-token fallback
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — token resolution edge cases', () => {
  it('leaves primaryAmount empty when token is not in state and address is not native', () => {
    // USDC address but NOT present in TokensController state → not native, not erc-20
    // → sourceTokenSymbol is undefined → primaryAmount stays empty
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: USDC_ADDRESS, amount: '1000000' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      // No token in allTokens — selectSingleTokenByAddressAndChainId returns undefined
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('');
  });

  it('leaves primaryAmount empty when getNativeTokenAddress throws for unknown chainId', () => {
    // Use a chainId our mock does not support → isNativeTokenAddress catch → returns false.
    // We also include the chain in networkConfigurationsByChainId so that
    // selectTickerByChainId does not error if the reselect stability check
    // ever exercises that path.
    const UNKNOWN_CHAIN: Hex = '0x89'; // Polygon (not in our mock)
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: UNKNOWN_CHAIN },
      requiredAssets: [{ address: USDC_ADDRESS, amount: '1000000' }],
    });

    const stateWithPolygon = {
      engine: {
        backgroundState: {
          CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
          TokenRatesController: { marketData: {} },
          TokensController: { allTokens: {} },
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID]: { nativeCurrency: 'ETH' },
              [UNKNOWN_CHAIN]: { nativeCurrency: 'MATIC' },
            },
          },
        },
      },
    } as unknown as import('../../../../util/test/renderWithProvider').ProviderValues['state'];

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: stateWithPolygon },
    );

    expect(result.current.primaryAmount).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — description', () => {
  it('uses moneySubtitle when present', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      moneySubtitle: 'My custom subtitle',
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );

    expect(result.current.description).toBe('My custom subtitle');
  });

  it('falls back to sourceTokenSymbol as description when no moneySubtitle', () => {
    // USDC in state so sourceTokenSymbol is 'USDC'
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
    });
    const stateWithUsdc = {
      engine: {
        backgroundState: {
          CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
          TokenRatesController: { marketData: {} },
          TokensController: {
            allTokens: {
              [CHAIN_ID]: {
                '0xSomeWallet': [
                  {
                    address: USDC_ADDRESS,
                    symbol: 'USDC',
                    decimals: 6,
                    image: undefined,
                  },
                ],
              },
            },
          },
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID]: { nativeCurrency: 'ETH' },
            },
          },
        },
      },
    } as unknown as import('../../../../util/test/renderWithProvider').ProviderValues['state'];

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: stateWithUsdc },
    );

    expect(result.current.description).toBe('USDC');
  });
});

// ---------------------------------------------------------------------------
// Fiat formatting — mUSD via market rate
// ---------------------------------------------------------------------------

const MUSD_CHECKSUM = safeToChecksumAddress(MUSD_TOKEN_ADDRESS) as string;

const musedTx: TransactionMeta = {
  id: 'tx-musd',
  type: TransactionType.incoming,
  chainId: CHAIN_ID,
  transferInformation: {
    amount: '1000000000',
    symbol: 'mUSD',
    decimals: 6,
    contractAddress: MUSD_TOKEN_ADDRESS,
  },
} as unknown as TransactionMeta;

function musedMarketState(tokenPrice: number) {
  return {
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: 'usd',
          currencyRates: {
            ETH: {
              conversionRate: 3000,
              usdConversionRate: 3000,
              conversionDate: null,
            },
          },
        },
        TokenRatesController: {
          marketData: {
            [CHAIN_ID]: {
              [MUSD_CHECKSUM]: { price: tokenPrice },
            },
          },
        },
        TokensController: { allTokens: {} },
        NetworkController: {
          networkConfigurationsByChainId: {
            [CHAIN_ID]: { nativeCurrency: 'ETH' },
          },
        },
      },
    },
  } as unknown as ProviderValues['state'];
}

describe('useMoneyTransactionDisplayInfo — mUSD fiat formatting', () => {
  it('formats fiat in USD via market rate', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(musedTx, undefined),
      { state: musedMarketState(1 / 3000) },
    );

    expect(result.current.fiatAmount).toMatch(/^\+/);
    expect(result.current.fiatAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toContain('mUSD');
  });

  it('uses market rate and ETH→fiat conversion for non-USD currencies', () => {
    const state = {
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'eur',
            currencyRates: {
              ETH: {
                conversionRate: 2300,
                usdConversionRate: 2500,
                conversionDate: null,
              },
            },
          },
          TokenRatesController: {
            marketData: {
              [CHAIN_ID]: {
                [MUSD_CHECKSUM]: { price: 0.0004 },
              },
            },
          },
          TokensController: { allTokens: {} },
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID]: { nativeCurrency: 'ETH' },
            },
          },
        },
      },
    } as unknown as ProviderValues['state'];

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(musedTx, undefined),
      { state },
    );

    expect(result.current.fiatAmount).toMatch(/^\+/);
    expect(result.current.fiatAmount).toMatch(/920/);
    expect(result.current.primaryAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toContain('mUSD');
  });
});

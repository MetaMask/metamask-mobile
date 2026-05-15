import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';
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
    currencyRates?: Record<string, { conversionRate: number }>;
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
// Label derivation
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — label', () => {
  it('uses moneyActivityTitleKey when present', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      moneyActivityTitleKey: 'added',
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.added');
  });

  it('derives label from type for a direct deposit', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('derives label from type for a direct withdraw', () => {
    const tx = makeTx(TransactionType.moneyAccountWithdraw);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.sent');
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
   */
  it('converts 6-decimal USD amount to ETH via exchange rate', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: ETH_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: ETH_ADDRESS, amount: '998537' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      {
        state: makeState({
          currencyRates: { ETH: { conversionRate: 2242 } },
        }),
      },
    );

    // Exact value: 0.998537 / 2242 = 0.00044538...  → toFixed(6, ROUND_DOWN) = "0.000445"
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

  it('sets sourceTokenChainId for native tokens so the network logo can be shown', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: ETH_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: ETH_ADDRESS, amount: '998537' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      {
        state: makeState({
          currencyRates: { ETH: { conversionRate: 2242 } },
        }),
      },
    );

    expect(result.current.sourceTokenChainId).toBe(CHAIN_ID);
    expect(result.current.sourceTokenImage).toBeUndefined();
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

  it('returns deposited for incoming type', () => {
    const tx = makeTx(TransactionType.incoming);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('returns sent for simpleSend type', () => {
    const tx = makeTx(TransactionType.simpleSend);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.sent');
  });

  it('returns received (default) for unrecognised type', () => {
    const tx = makeTx(TransactionType.swap);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.received');
  });

  it('returns received for a batch tx with no money-type nested transaction', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.swap }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    // batch is not in the switch → default → 'received'
    expect(result.current.label).toBe('money.transaction.received');
  });
});

// ---------------------------------------------------------------------------
// Token resolution — catch branch and no-token fallback
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — token resolution edge cases', () => {
  it('leaves sourceTokenSymbol undefined when token is not in state and address is not native', () => {
    // USDC address but NOT present in TokensController state → not native, not erc-20
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [{ address: USDC_ADDRESS, amount: '1000000' }],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      // No token in allTokens — selectSingleTokenByAddressAndChainId returns undefined
      { state: makeState() },
    );

    expect(result.current.sourceTokenSymbol).toBeUndefined();
    expect(result.current.primaryAmount).toBe('');
  });

  it('leaves sourceTokenSymbol undefined when getNativeTokenAddress throws for unknown chainId', () => {
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

    expect(result.current.sourceTokenSymbol).toBeUndefined();
    expect(result.current.sourceTokenChainId).toBeUndefined();
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

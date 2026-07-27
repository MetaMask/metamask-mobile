import {
  type TransactionMeta,
  TransactionStatus,
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
import { useFiatPaymentMethodName } from './useFiatPaymentMethodName';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// The async ramp-order lookup is tested in useFiatPaymentMethodName.test.ts;
// here we defaults to undefined so deposit rows fall back to the default label.
jest.mock('./useFiatPaymentMethodName', () => ({
  useFiatPaymentMethodName: jest.fn(),
}));

const mockUseFiatPaymentMethodName = jest.mocked(useFiatPaymentMethodName);

beforeEach(() => {
  mockUseFiatPaymentMethodName.mockReturnValue(undefined);
});

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
    ['deposited', 'money.transaction.deposited'],
    ['received', 'money.transaction.received'],
    ['card_transaction', 'money.transaction.card_transaction'],
    ['converted', 'money.transaction.converted'],
    ['sent', 'money.transaction.sent'],
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

  it('returns converted for a crypto moneyAccountDeposit (conversion into mUSD)', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.converted');
  });

  it('returns deposited for a fiat on-ramp moneyAccountDeposit (e.g. Transak)', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { fiat: { orderId: 'order-1', provider: 'transak-native' } },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('returns deposited for an mUSD-funded moneyAccountDeposit (top-up, not a conversion)', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS, chainId: CHAIN_ID },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.deposited');
  });

  it('returns received for incoming type (external mUSD arriving at the money account)', () => {
    const tx = makeTx(TransactionType.incoming);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.received');
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

  it('returns received for tokenMethodTransfer type', () => {
    const tx = makeTx(TransactionType.tokenMethodTransfer);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.received');
  });

  it('returns received for tokenMethodTransferFrom type', () => {
    const tx = makeTx(TransactionType.tokenMethodTransferFrom);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.received');
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

  it('derives converted from nested type for an EIP-7702 batch crypto deposit', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.converted');
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
    ['deposited', IconName.Add],
    ['received', IconName.Arrow2Down],
    ['card_transaction', IconName.Card],
    ['converted', IconName.Refresh],
    ['sent', IconName.Arrow2UpRight],
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
  it('returns Add when type is undefined (defaults to the deposited kind)', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, { type: undefined });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Add);
  });

  it('returns Refresh for a crypto moneyAccountDeposit (conversion into mUSD)', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Refresh);
  });

  it('returns Add for a fiat on-ramp moneyAccountDeposit', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { fiat: { orderId: 'order-1', provider: 'transak-native' } },
    });
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

  it('returns Arrow2UpRight for moneyAccountWithdraw type (the "Sent" row)', () => {
    const tx = makeTx(TransactionType.moneyAccountWithdraw);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2UpRight);
  });

  it('returns Arrow2UpRight for simpleSend type', () => {
    const tx = makeTx(TransactionType.simpleSend);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2UpRight);
  });

  it('returns Arrow2Down for tokenMethodTransfer type', () => {
    const tx = makeTx(TransactionType.tokenMethodTransfer);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2Down);
  });

  it('returns Arrow2Down for tokenMethodTransferFrom type', () => {
    const tx = makeTx(TransactionType.tokenMethodTransferFrom);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2Down);
  });

  it('returns Arrow2Down (default) for unrecognised type', () => {
    const tx = makeTx(TransactionType.swap);
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2Down);
  });

  it('returns Refresh for a batch tx with a nested crypto moneyAccountDeposit', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Refresh);
  });

  it('returns Arrow2UpRight for a batch tx with a nested moneyAccountWithdraw', () => {
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.icon).toBe(IconName.Arrow2UpRight);
  });
});

// ---------------------------------------------------------------------------
// Primary amount — denominated in mUSD (the money-account currency)
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — mUSD-denominated primary amount', () => {
  // A conversion deposit is shown in mUSD, derived from the mUSD entry in
  // `requiredAssets` (6-decimal mUSD units, pegged 1:1 to USD). The pay token
  // and its market price no longer affect the primary amount — see MUSD-956.
  //
  // Production declares the required asset as mUSD on the tx's chain (see
  // `getMoneyAccountDepositAssetAddress`), so the fixture mirrors that shape.

  function makeDepositTx(amount: string, tokenAddress: Hex = USDC_ADDRESS) {
    return makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress, chainId: CHAIN_ID },
      requiredAssets: [
        { address: MUSD_TOKEN_ADDRESS, amount, standard: 'erc20' },
      ],
    });
  }

  it('renders the deposit target in mUSD with 2 decimals and grouping', () => {
    // 1_000_000_000 / 1e6 = 1000 → "+1,000.00 mUSD"
    const { result } = renderHookWithProvider(
      () =>
        useMoneyTransactionDisplayInfo(makeDepositTx('1000000000'), undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('+1,000.00 mUSD');
  });

  it('is independent of the pay token and its market price', () => {
    // A native-ETH deposit with no market data at all still renders in mUSD.
    const { result } = renderHookWithProvider(
      () =>
        useMoneyTransactionDisplayInfo(
          makeDepositTx('1000000', ETH_ADDRESS),
          undefined,
        ),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('+1.00 mUSD');
  });

  it('rounds the 6-decimal mUSD value to 2 decimals', () => {
    // 998537 / 1e6 = 0.998537 → "+1.00 mUSD"
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(makeDepositTx('998537'), undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('+1.00 mUSD');
  });

  it('leaves primaryAmount empty when there is no required asset', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('');
  });

  it('leaves primaryAmount empty when the deposit amount is zero', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(makeDepositTx('0'), undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('');
  });

  it('leaves primaryAmount empty (not "+0.00") for a sub-cent deposit', () => {
    // 4999 / 1e6 = 0.004999 rounds to 0.00 at 2 decimals — rendering it would
    // produce "+0.00 mUSD", the marker reserved for failed rows.
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(makeDepositTx('4999'), undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('');
  });

  it('renders the smallest amount visible at 2 decimals', () => {
    // 5000 / 1e6 = 0.005 → "+0.01 mUSD" (half-up, matching Intl rounding).
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(makeDepositTx('5000'), undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('+0.01 mUSD');
  });

  it('parses the hex-encoded amount that production writes', () => {
    // `RequiredAsset.amount` is typed `Hex` and written via `toHex(...)` (see
    // useUpdateTransactionPayAmount) — 0x3b9aca00 = 1_000_000_000 → 1000 mUSD.
    const { result } = renderHookWithProvider(
      () =>
        useMoneyTransactionDisplayInfo(makeDepositTx('0x3b9aca00'), undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('+1,000.00 mUSD');
  });

  it('ignores a required asset that is not mUSD on the tx chain', () => {
    // The amount is only known to be mUSD-denominated when the asset is mUSD;
    // rendering any other asset's raw amount as mUSD would mis-denominate it.
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [
        { address: USDC_ADDRESS, amount: '1000000000', standard: 'erc20' },
      ],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('');
  });

  it('finds the mUSD required asset even when it is not first', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [
        { address: USDC_ADDRESS, amount: '7', standard: 'erc20' },
        { address: MUSD_TOKEN_ADDRESS, amount: '2500000', standard: 'erc20' },
      ],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );

    expect(result.current.primaryAmount).toBe('+2.50 mUSD');
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
  it('leaves the conversion subtitle bare when the token is neither in state nor native', () => {
    // USDC address but NOT present in TokensController state → not native, not
    // erc-20 → sourceTokenSymbol is undefined → no "<token> → mUSD" pair. The
    // mUSD amount still renders, since it no longer depends on the pay token.
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [
        { address: MUSD_TOKEN_ADDRESS, amount: '1000000', standard: 'erc20' },
      ],
    });

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      // No token in allTokens — selectSingleTokenByAddressAndChainId returns undefined
      { state: makeState() },
    );

    expect(result.current.description).toBeUndefined();
    expect(result.current.primaryAmount).toBe('+1.00 mUSD');
  });

  it('does not crash when getNativeTokenAddress throws for an unknown chainId', () => {
    // Use a chainId our mock does not support → isNativeTokenAddress catch → returns false.
    // We also include the chain in networkConfigurationsByChainId so that
    // selectTickerByChainId does not error if the reselect stability check
    // ever exercises that path.
    const UNKNOWN_CHAIN: Hex = '0x89'; // Polygon (not in our mock)
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: UNKNOWN_CHAIN },
      requiredAssets: [
        { address: MUSD_TOKEN_ADDRESS, amount: '1000000', standard: 'erc20' },
      ],
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

    expect(result.current.description).toBeUndefined();
    expect(result.current.primaryAmount).toBe('+1.00 mUSD');
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

  it('shows the "<token> → mUSD" pair for a crypto conversion deposit', () => {
    // USDC in state so sourceTokenSymbol is 'USDC'; a crypto moneyAccountDeposit
    // is a conversion, so the subtitle becomes the token pair.
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

    expect(result.current.description).toBe('USDC → mUSD');
  });
});

// ---------------------------------------------------------------------------
// Fiat formatting — mUSD pegged via the Money Account chain (Monad)
// ---------------------------------------------------------------------------

const MUSD_CHECKSUM = safeToChecksumAddress(MUSD_TOKEN_ADDRESS) as string;
// mUSD activity is gated to the Money Account chain (Monad). `CHAIN_IDS.MONAD`
// would be cleaner but we keep the literal here to avoid pulling the constants
// import into this large test file.
const MUSD_CHAIN_ID: Hex = '0x8f';

const musedTx: TransactionMeta = {
  id: 'tx-musd',
  type: TransactionType.incoming,
  chainId: MUSD_CHAIN_ID,
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
            [MUSD_CHAIN_ID]: {
              [MUSD_CHECKSUM]: { price: tokenPrice },
            },
          },
        },
        TokensController: { allTokens: {} },
        NetworkController: {
          networkConfigurationsByChainId: {
            [MUSD_CHAIN_ID]: { nativeCurrency: 'ETH' },
          },
        },
      },
    },
  } as unknown as ProviderValues['state'];
}

describe('useMoneyTransactionDisplayInfo — mUSD fiat formatting', () => {
  it('formats fiat in USD via the peg (ignoring market rate)', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(musedTx, undefined),
      { state: musedMarketState(1 / 3000) },
    );

    expect(result.current.fiatAmount).toMatch(/^\+/);
    expect(result.current.fiatAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toContain('mUSD');
  });

  it('always shows mUSD in USD via the peg, ignoring preferred currency', () => {
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
              [MUSD_CHAIN_ID]: {
                [MUSD_CHECKSUM]: { price: 0.0004 },
              },
            },
          },
          TokensController: { allTokens: {} },
          NetworkController: {
            networkConfigurationsByChainId: {
              [MUSD_CHAIN_ID]: { nativeCurrency: 'ETH' },
            },
          },
        },
      },
    } as unknown as ProviderValues['state'];

    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(musedTx, undefined),
      { state },
    );

    expect(result.current.fiatAmount).toBe('+$1,000.00');
    expect(result.current.primaryAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toContain('mUSD');
  });
});

// ---------------------------------------------------------------------------
// Status — derived state + status-aware label
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — status', () => {
  it.each([
    [TransactionStatus.confirmed, 'confirmed'],
    [TransactionStatus.submitted, 'pending'],
    [TransactionStatus.failed, 'failed'],
  ])('exposes status %s as %s', (status, expected) => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, { status });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.status).toBe(expected);
  });

  it('uses the present-tense label while a conversion is pending', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      status: TransactionStatus.submitted,
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.converting');
  });

  it('uses the failed label when a conversion fails', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      status: TransactionStatus.failed,
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.label).toBe('money.transaction.conversion_failed');
  });
});

// ---------------------------------------------------------------------------
// Failed rows — zero amount, signed by direction (MUSD-956)
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — failed amount', () => {
  it('shows +0.00 mUSD / +$0.00 for a failed (incoming) conversion', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      status: TransactionStatus.failed,
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      requiredAssets: [
        {
          address: MUSD_TOKEN_ADDRESS,
          amount: '1000000000',
          standard: 'erc20',
        },
      ],
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.primaryAmount).toBe('+0.00 mUSD');
    expect(result.current.fiatAmount).toBe('+$0.00');
  });

  it('shows -0.00 mUSD / -$0.00 for a failed (outgoing) send', () => {
    const tx = makeTx(TransactionType.moneyAccountWithdraw, {
      status: TransactionStatus.failed,
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.primaryAmount).toBe('-0.00 mUSD');
    expect(result.current.fiatAmount).toBe('-$0.00');
  });
});

// ---------------------------------------------------------------------------
// Per-kind subtitles
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — per-kind subtitles', () => {
  it('received → "From: <sender>"', () => {
    const tx = makeTx(TransactionType.incoming, {
      txParams: { from: '0x2323100000000000000000000000000000012345' },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    // i18n mock returns the key; interpolation is exercised in integration.
    expect(result.current.description).toBe('money.transaction.received_from');
  });

  it('sent → "mUSD → <destination token>" when the dest token resolves', () => {
    const tx = makeTx(TransactionType.moneyAccountWithdraw, {
      metamaskPay: { tokenAddress: ETH_ADDRESS, chainId: CHAIN_ID },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.description).toBe('mUSD → ETH');
  });

  it('sent → "mUSD" for a plain mUSD send (no redundant "mUSD → mUSD")', () => {
    // A simple mUSD transfer out of the Money account: the pay token resolves
    // to mUSD, so the pair would be "mUSD → mUSD". It collapses to just "mUSD",
    // mirroring the deposit row.
    const tx = makeTx(TransactionType.simpleSend, {
      metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS, chainId: CHAIN_ID },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.description).toBe('mUSD');
  });

  it('sent → "mUSD" for a withdrawal whose dest token cannot be resolved', () => {
    // No metamaskPay token → withdrawals pay out the vault asset (mUSD), so
    // an unresolvable destination is a plain mUSD send, never a token pair.
    const tx = makeTx(TransactionType.moneyAccountWithdraw, {});
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.description).toBe('mUSD');
  });

  it('deposited (fiat on-ramp) → provider name when the payment method is unresolved', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { fiat: { orderId: 'o-1', provider: 'transak-native' } },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.description).toBe('Transak');
  });

  it('deposited (fiat on-ramp) → payment-method name when resolved', () => {
    // The payment method (e.g. "Apple Pay") is preferred over the provider name.
    mockUseFiatPaymentMethodName.mockReturnValue('Apple Pay');
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { fiat: { orderId: 'o-1', provider: 'transak-native' } },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.description).toBe('Apple Pay');
  });

  it('deposited (mUSD top-up) → "mUSD"', () => {
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS, chainId: CHAIN_ID },
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState() },
    );
    expect(result.current.description).toBe('mUSD');
  });

  it('canonicalises the registry "MUSD" symbol to the branded "mUSD"', () => {
    // mUSD is registered with the uppercase symbol "MUSD"; the subtitle must
    // still show the branded casing, not whatever the registry holds.
    const tx = makeTx(TransactionType.moneyAccountDeposit, {
      metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS, chainId: CHAIN_ID },
    });
    const stateWithUppercaseMusd = {
      engine: {
        backgroundState: {
          CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
          TokenRatesController: { marketData: {} },
          TokensController: {
            allTokens: {
              [CHAIN_ID]: {
                '0xSomeWallet': [
                  { address: MUSD_TOKEN_ADDRESS, symbol: 'MUSD', decimals: 6 },
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
      { state: stateWithUppercaseMusd },
    );
    expect(result.current.description).toBe('mUSD');
  });

  it('sent → "mUSD" even when the registry symbol is uppercase "MUSD"', () => {
    // The send pair must collapse to "mUSD" (not "mUSD → MUSD") once the
    // destination symbol is canonicalised.
    const tx = makeTx(TransactionType.simpleSend, {
      metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS, chainId: CHAIN_ID },
    });
    const stateWithUppercaseMusd = {
      engine: {
        backgroundState: {
          CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
          TokenRatesController: { marketData: {} },
          TokensController: {
            allTokens: {
              [CHAIN_ID]: {
                '0xSomeWallet': [
                  { address: MUSD_TOKEN_ADDRESS, symbol: 'MUSD', decimals: 6 },
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
      { state: stateWithUppercaseMusd },
    );
    expect(result.current.description).toBe('mUSD');
  });
});

// ---------------------------------------------------------------------------
// Perps/Predict ↔ Money transfers (matched via the mUSD pay token)
// ---------------------------------------------------------------------------

describe('useMoneyTransactionDisplayInfo — Perps/Predict ↔ Money', () => {
  const MONAD: Hex = '0x8f';
  const payOnMonad = (extra: Record<string, string>) => ({
    tokenAddress: MUSD_TOKEN_ADDRESS,
    chainId: MONAD,
    ...extra,
  });

  it('renders a money-funded Perps deposit as an outflow ("Sent")', () => {
    // Outflow → the debit from the account, including the bridge fee = totalFiat.
    const tx = makeTx(TransactionType.perpsDeposit, {
      metamaskPay: payOnMonad({ totalFiat: '0.67157', targetFiat: '0.64' }),
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState({ currentCurrency: 'usd' }) },
    );

    expect(result.current.label).toBe('money.transaction.sent');
    expect(result.current.icon).toBe(IconName.Arrow2UpRight);
    expect(result.current.description).toBe(
      'transaction_details.label.perps_account',
    );
    expect(result.current.isIncoming).toBe(false);
    expect(result.current.primaryAmount).toBe('-0.67 mUSD');
    expect(result.current.fiatAmount).toBe('-$0.67');
  });

  it('renders a Predict withdraw into the Money account as an inflow ("Deposited")', () => {
    // Inflow → the net amount that lands = targetFiat. Withdraw sits in the
    // EIP-7702 batch's nested calls.
    const tx = makeTx(TransactionType.batch, {
      nestedTransactions: [{ type: TransactionType.predictWithdraw }],
      metamaskPay: payOnMonad({
        totalFiat: '0.158879',
        targetFiat: '0.099965',
      }),
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState({ currentCurrency: 'usd' }) },
    );

    expect(result.current.label).toBe('money.transaction.deposited');
    expect(result.current.icon).toBe(IconName.Add);
    expect(result.current.description).toBe(
      'transaction_details.label.predictions_account',
    );
    expect(result.current.isIncoming).toBe(true);
    expect(result.current.primaryAmount).toBe('+0.10 mUSD');
    expect(result.current.fiatAmount).toBe('+$0.10');
  });

  it('shows signed-zero (not the real amount) for a failed money-funded Perps deposit', () => {
    // Failed rows must show signed-zero like every other kind; the perps amount
    // block must not clobber it.
    const tx = makeTx(TransactionType.perpsDeposit, {
      status: TransactionStatus.failed,
      metamaskPay: payOnMonad({ totalFiat: '0.67157', targetFiat: '0.64' }),
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState({ currentCurrency: 'usd' }) },
    );

    expect(result.current.label).toBe('money.transaction.send_failed');
    expect(result.current.isIncoming).toBe(false);
    expect(result.current.primaryAmount).toBe('-0.00 mUSD');
    expect(result.current.fiatAmount).toBe('-$0.00');
  });

  it('shows signed-zero for a failed Predict withdraw into the Money account', () => {
    const tx = makeTx(TransactionType.batch, {
      status: TransactionStatus.failed,
      nestedTransactions: [{ type: TransactionType.predictWithdraw }],
      metamaskPay: payOnMonad({
        totalFiat: '0.158879',
        targetFiat: '0.099965',
      }),
    });
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
      { state: makeState({ currentCurrency: 'usd' }) },
    );

    expect(result.current.isIncoming).toBe(true);
    expect(result.current.primaryAmount).toBe('+0.00 mUSD');
    expect(result.current.fiatAmount).toBe('+$0.00');
  });
});

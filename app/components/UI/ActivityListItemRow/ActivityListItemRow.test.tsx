/**
 * Tests for ActivityListItemRow — exhaustive status and type mapping.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import type { ActivityListItem, Status } from '../../../util/activity-adapters';
import { ActivityListItemRow } from './ActivityListItemRow';
import { strings } from '../../../../locales/i18n';
import { getNetworkImageSource } from '../../../util/networks';

const LINEA_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const LINEA_MUSD_CHECKSUM_ADDRESS =
  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

const mockState = {
  user: {
    appTheme: 'light',
  },
  settings: {
    showFiatOnTestnets: true,
  },
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 2500,
            usdConversionRate: 2500,
          },
        },
      },
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
          },
        },
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            [LINEA_MUSD_CHECKSUM_ADDRESS]: {
              price: 0.0004,
            },
          },
        },
      },
    },
  },
};

// Minimal required mocks
jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    try {
      return selector(mockState);
    } catch {
      return undefined;
    }
  }),
}));

jest.mock('../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(
    (state) =>
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
  ),
  selectCurrencyRateForChainId: jest.fn(() => 2500),
}));

jest.mock('../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(
    (state) => state.engine.backgroundState.TokenRatesController.marketData,
  ),
}));

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    useColorScheme: jest.fn(() => 'light'),
  };
});

jest.mock('../../../util/transaction-icons', () => ({
  getTransactionIcon: jest.fn(() => 1),
}));

jest.mock('../../../util/date', () => ({
  toDateFormat: jest.fn(() => 'Jan 1'),
}));

jest.mock('../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

jest.mock('../../../component-library/components/Badges/BadgeWrapper', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
});

jest.mock('../../../component-library/components/Badges/Badge', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Badge = () => ReactActual.createElement(View, null);
  Badge.displayName = 'Badge';
  return {
    __esModule: true,
    default: Badge,
    BadgeVariant: { Network: 'Network' },
  };
});

jest.mock('../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Xs: 'xs' },
}));

jest.mock('../../../component-library/components/Texts/Text', () => ({
  getFontFamily: jest.fn(() => 'Inter'),
  TextVariant: {
    BodyLGMedium: 'bodyLGMedium',
    BodyMDBold: 'bodyMDBold',
    BodyMD: 'bodyMD',
  },
}));

jest.mock('../../Base/ListItem', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: TextActual, View } = jest.requireActual('react-native');

  const ListItem = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);

  ListItem.Date = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(TextActual, null, children);
  ListItem.Content = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  ListItem.Icon = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  ListItem.Body = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  ListItem.Title = ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    numberOfLines?: number;
    style?: object;
  }) => ReactActual.createElement(TextActual, rest, children);
  ListItem.Amount = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(TextActual, null, children);
  ListItem.Amounts = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  ListItem.FiatAmount = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(TextActual, null, children);

  return ListItem;
});

// ---------------------------------------------------------------------------
// Helper to build minimal ActivityListItem
// ---------------------------------------------------------------------------

const makeItem = (
  overrides: Partial<{
    type: ActivityListItem['type'];
    status: Status;
    isEarliestNonce: boolean;
    hash: string;
    from: string;
    to: string;
    token?: object;
  }>,
): ActivityListItem => {
  const type = overrides.type ?? 'send';
  const status = overrides.status ?? 'success';
  const base = {
    type,
    chainId: 'eip155:1' as const,
    status,
    timestamp: 1_700_000_000_000,
    isEarliestNonce: overrides.isEarliestNonce,
  };

  if (type === 'send' || type === 'receive') {
    return {
      ...base,
      type,
      data: {
        hash: overrides.hash ?? '0xabc',
        from: overrides.from ?? '0xfrom',
        to: overrides.to ?? '0xto',
        token: overrides.token as never,
      },
    } as unknown as ActivityListItem;
  }

  return {
    ...base,
    type,
    data: {
      hash: overrides.hash ?? '0xabc',
      from: overrides.from ?? '0xfrom',
      to: overrides.to ?? '0xto',
    },
  } as unknown as ActivityListItem;
};

// ---------------------------------------------------------------------------
// Status mapping tests — prove all Status values map to explicit display labels
// ---------------------------------------------------------------------------

describe('ActivityListItemRow — status display', () => {
  const allStatuses: Status[] = ['pending', 'success', 'failed', 'cancelled'];

  it.each(allStatuses)(
    'renders an explicit non-empty status label for status=%s',
    (status) => {
      const item = makeItem({ status });
      const { getByTestId } = render(
        <ActivityListItemRow item={item} index={0} />,
      );
      const el = getByTestId('transaction-status-0');
      expect(el.props.children).toBeTruthy();
    },
  );

  it('shows "Confirmed" for success status', () => {
    const item = makeItem({ status: 'success' });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );
    const el = getByTestId('transaction-status-0');
    expect(el.props.children).toBe(strings('transaction.confirmed'));
  });

  it('shows "Failed" for failed status', () => {
    const item = makeItem({ status: 'failed' });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );
    const el = getByTestId('transaction-status-0');
    expect(el.props.children).toBe(strings('transaction.failed'));
  });

  it('shows "Cancelled" for cancelled status', () => {
    const item = makeItem({ status: 'cancelled' });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );
    const el = getByTestId('transaction-status-0');
    expect(el.props.children).toBe(strings('transaction.cancelled'));
  });

  it('shows "Submitted" for pending status (earliest nonce)', () => {
    const item = makeItem({ status: 'pending', isEarliestNonce: true });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );
    const el = getByTestId('transaction-status-0');
    expect(el.props.children).toBe(strings('transaction.submitted'));
  });
});

describe('ActivityListItemRow — network badge', () => {
  it('uses the row item chainId for the network badge', () => {
    const item = makeItem({ status: 'success' });
    render(<ActivityListItemRow item={item} index={0} />);

    expect(getNetworkImageSource).toHaveBeenCalledWith({
      chainId: item.chainId,
    });
  });
});

describe('ActivityListItemRow — amount display', () => {
  it('formats raw token base units and renders fiat when rates are available', () => {
    const item = makeItem({
      status: 'success',
      token: {
        amount: '1000000',
        decimals: 6,
        symbol: 'mUSD',
        assetId: `eip155:1/erc20:${LINEA_MUSD_ADDRESS}`,
        direction: 'in',
      },
    });

    const { getByText } = render(<ActivityListItemRow item={item} index={0} />);

    expect(getByText('+1 mUSD')).toBeOnTheScreen();
    expect(getByText('+$1')).toBeOnTheScreen();
  });

  it('does not render fiat when token market data is unavailable', () => {
    const item = makeItem({
      status: 'success',
      token: {
        amount: '1000000',
        decimals: 6,
        symbol: 'UNKNOWN',
        assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
        direction: 'in',
      },
    });

    const { getByText, queryByText } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByText('+1 UNKNOWN')).toBeOnTheScreen();
    expect(queryByText('+$1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Type mapping tests — prove all ActivityKind values produce a non-empty title
// ---------------------------------------------------------------------------

const ALL_KINDS: ActivityListItem['type'][] = [
  'send',
  'receive',
  'swap',
  'swapIncomplete',
  'bridge',
  'buy',
  'sell',
  'claim',
  'claimMusdBonus',
  'deposit',
  'convert',
  'wrap',
  'unwrap',
  'approveSpendingCap',
  'revokeSpendingCap',
  'increaseSpendingCap',
  'lendingDeposit',
  'lendingWithdrawal',
  'nftMint',
  'contractInteraction',
  'contractDeployment',
  'smartAccountUpgrade',
  'predictionsAddFunds',
  'predictionsWithdrawFunds',
  'predictionClaimWinnings',
  'predictionCashedOut',
  'predictionPlaced',
  'perpsAddFunds',
  'perpsWithdrawFunds',
  'perpsOpenLong',
  'perpsCloseLong',
  'perpsCloseLongLiquidated',
  'perpsCloseLongStopLoss',
  'perpsOpenShort',
  'perpsCloseShort',
  'perpsCloseShortLiquidated',
  'perpsCloseShortStopLoss',
  'perpsPaidFundingFees',
  'perpsReceivedFundingFees',
  'perpsCloseShortTakeProfit',
  'perpsCloseLongTakeProfit',
  'marketShort',
  'stopMarketCloseShort',
  'marketCloseShort',
];

const EXPECTED_TITLES = {
  send: strings('transactions.sent'),
  receive: strings('transactions.received'),
  swap: strings('transactions.swaps_transaction'),
  swapIncomplete: strings('transactions.swaps_transaction'),
  bridge: strings('transactions.bridge_transaction'),
  buy: strings('transactions.activity_buy'),
  sell: strings('transactions.activity_sell'),
  claim: strings('transactions.claim'),
  claimMusdBonus: strings('transactions.activity_claim_musd_bonus'),
  deposit: strings('transactions.tx_review_staking_deposit'),
  convert: strings('transactions.tx_review_musd_conversion'),
  wrap: strings('transactions.activity_wrap'),
  unwrap: strings('transactions.activity_unwrap'),
  approveSpendingCap: strings('transactions.tx_review_approve'),
  revokeSpendingCap: strings('transactions.activity_revoke_spending_cap'),
  increaseSpendingCap: strings('transactions.tx_review_increase_allowance'),
  lendingDeposit: strings('transactions.tx_review_lending_deposit'),
  lendingWithdrawal: strings('transactions.tx_review_lending_withdraw'),
  nftMint: strings('transactions.activity_nft_mint'),
  contractInteraction: strings('transactions.smart_contract_interaction'),
  contractDeployment: strings('transactions.tx_review_contract_deployment'),
  smartAccountUpgrade: strings('transactions.activity_smart_account_upgrade'),
  predictionsAddFunds: strings('transactions.tx_review_predict_deposit'),
  predictionsWithdrawFunds: strings('transactions.tx_review_predict_withdraw'),
  predictionClaimWinnings: strings('transactions.tx_review_predict_claim'),
  predictionCashedOut: strings('transactions.activity_prediction_cashed_out'),
  predictionPlaced: strings('transactions.activity_prediction_placed'),
  perpsAddFunds: strings('transactions.tx_review_perps_deposit'),
  perpsWithdrawFunds: strings('transactions.tx_review_perps_withdraw'),
  perpsOpenLong: strings('transactions.activity_perps_open_long'),
  perpsCloseLong: strings('transactions.activity_perps_close_long'),
  perpsCloseLongLiquidated: strings(
    'transactions.activity_perps_close_long_liquidated',
  ),
  perpsCloseLongStopLoss: strings(
    'transactions.activity_perps_close_long_stop_loss',
  ),
  perpsOpenShort: strings('transactions.activity_perps_open_short'),
  perpsCloseShort: strings('transactions.activity_perps_close_short'),
  perpsCloseShortLiquidated: strings(
    'transactions.activity_perps_close_short_liquidated',
  ),
  perpsCloseShortStopLoss: strings(
    'transactions.activity_perps_close_short_stop_loss',
  ),
  perpsPaidFundingFees: strings(
    'transactions.activity_perps_paid_funding_fees',
  ),
  perpsReceivedFundingFees: strings(
    'transactions.activity_perps_received_funding_fees',
  ),
  perpsCloseShortTakeProfit: strings(
    'transactions.activity_perps_close_short_take_profit',
  ),
  perpsCloseLongTakeProfit: strings(
    'transactions.activity_perps_close_long_take_profit',
  ),
  marketShort: strings('transactions.activity_market_short'),
  stopMarketCloseShort: strings(
    'transactions.activity_stop_market_close_short',
  ),
  marketCloseShort: strings('transactions.activity_market_close_short'),
} satisfies Record<ActivityListItem['type'], string>;

describe('ActivityListItemRow — title display for all ActivityKind values', () => {
  it.each(ALL_KINDS)('renders the explicit title for type=%s', (type) => {
    const item = makeItem({ type, status: 'success' });
    const { getByText, queryByText } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByText(EXPECTED_TITLES[type])).toBeOnTheScreen();
    expect(queryByText(strings('transactions.interaction'))).toBeNull();
  });

  it('prefers the title override when provided (legacy swap/bridge contract)', () => {
    const item = makeItem({ type: 'swap', status: 'success' });
    const { getByText, queryByText } = render(
      <ActivityListItemRow item={item} index={0} title="Swap ETH to USDC" />,
    );

    expect(getByText('Swap ETH to USDC')).toBeOnTheScreen();
    expect(queryByText(strings('transactions.swaps_transaction'))).toBeNull();
  });
});

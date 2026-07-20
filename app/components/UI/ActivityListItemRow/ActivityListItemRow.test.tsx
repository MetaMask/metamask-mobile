/**
 * Tests for ActivityListItemRow content mapping.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';
import type { ActivityListItem, Status } from '../../../util/activity-adapters';
import { ActivityListItemRow } from './ActivityListItemRow';
import { ActivityListItemRowPendingActions } from './ActivityListItemRowPendingActions';
import { strings } from '../../../../locales/i18n';
import { getNetworkImageSource } from '../../../util/networks';
import { hasGasFeeTokenSelected } from '../../Views/confirmations/utils/transaction';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
  selectUSDConversionRateByChainId,
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../selectors/tokenRatesController';
import { useTokensData } from '../../hooks/useTokensData/useTokensData';

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
jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { default: 'white', alternative: 'grey' },
      text: { default: 'black', alternative: 'grey', muted: 'grey' },
      border: { muted: 'grey' },
      success: { default: 'green' },
      error: { default: 'red' },
      warning: { default: 'orange' },
      primary: { default: 'blue' },
      icon: { default: 'grey' },
    },
    typography: {
      sBodyLGMedium: { fontSize: 16 },
      sBodyMDMedium: { fontSize: 14 },
      sBodyMDBold: { fontSize: 14, fontWeight: 'bold' },
      sBodyMD: { fontSize: 14 },
      sBodySM: { fontSize: 12 },
    },
  })),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    const str = selector.toString();
    if (str.includes('appTheme')) return 'light';
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
  selectConversionRateByChainId: jest.fn(() => 2500),
  selectCurrencyRateForChainId: jest.fn(() => 2500),
  selectUSDConversionRateByChainId: jest.fn(() => 2500),
}));

jest.mock('../../../selectors/tokenRatesController', () => ({
  selectContractExchangeRatesByChainId: jest.fn(() => ({
    [LINEA_MUSD_ADDRESS]: {
      price: 0.0004,
    },
  })),
  selectTokenMarketData: jest.fn(
    (state) => state.engine.backgroundState.TokenRatesController.marketData,
  ),
}));

jest.mock('../../hooks/useTokensData/useTokensData', () => ({
  useTokensData: jest.fn(() => ({})),
}));

jest.mock('../Earn/constants/musd', () => ({
  MUSD_DECIMALS: 6,
  MUSD_TOKEN: { symbol: 'mUSD' },
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {
    '0x1': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    '0xe708': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
  MUSD_TOKEN_ASSET_ID_BY_CHAIN: {
    '0x1': 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    '0xe708': 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
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

jest.mock('../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

jest.mock('../../../util/address', () => ({
  renderShortAddress: jest.fn((address: string) => `${address.slice(0, 6)}...`),
  safeToChecksumAddress: jest.requireActual('../../../util/address')
    .safeToChecksumAddress,
}));

jest.mock('../../../component-library/components/Texts/Text', () => ({
  getFontFamily: jest.fn(() => 'Inter'),
  TextVariant: {
    BodyLGMedium: 'bodyLGMedium',
    BodyMDMedium: 'bodyMDMedium',
    BodyMDBold: 'bodyMDBold',
    BodyMD: 'bodyMD',
    BodySM: 'bodySM',
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');

  const ListItem = ({
    avatar,
    description,
    endAccessory,
    isInteractive,
    onPress,
    title,
    ...rest
  }: {
    avatar?: React.ReactNode;
    description?: React.ReactNode;
    endAccessory?: React.ReactNode;
    isInteractive?: boolean;
    onPress?: () => void;
    title?: React.ReactNode;
  }) => {
    const Component = isInteractive ? Pressable : View;
    return ReactActual.createElement(
      Component,
      { onPress, ...rest },
      avatar,
      ReactActual.createElement(View, null, title, description),
      endAccessory,
    );
  };

  const Icon = ({ testID }: { testID?: string }) =>
    ReactActual.createElement(View, { testID });

  const AvatarToken = ({ name, src }: { name?: string; src?: unknown }) =>
    ReactActual.createElement(View, {
      testID: `avatar-token-${name ?? 'unknown'}`,
      src,
    });

  const AvatarIcon = ({
    iconName,
    severity,
  }: {
    iconName?: string;
    severity?: string;
  }) =>
    ReactActual.createElement(View, {
      testID: `avatar-icon-${iconName ?? 'unknown'}`,
      severity,
    });

  const BadgeNetwork = ({ src }: { src?: unknown }) =>
    ReactActual.createElement(View, { src });

  const BadgeWrapper = ({
    children,
    badge,
  }: {
    children?: React.ReactNode;
    badge?: React.ReactNode;
  }) => ReactActual.createElement(View, null, children, badge);

  return {
    Icon,
    IconColor: { IconAlternative: 'icon-alternative' },
    IconName: {
      Clock: 'Clock',
      Arrow2UpRight: 'Arrow2UpRight',
      Received: 'Received',
      SwapHorizontal: 'SwapHorizontal',
    },
    IconSize: { Sm: '16' },
    ListItem,
    AvatarToken,
    AvatarTokenSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
    AvatarIcon,
    AvatarIconSeverity: { Neutral: 'neutral', Danger: 'danger' },
    AvatarIconSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
    BadgeNetwork,
    BadgeWrapper,
    BadgeWrapperPosition: { BottomRight: 'BottomRight' },
  };
});

jest.mock('../StyledButton', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: TextActual } = jest.requireActual('react-native');
  return ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => ReactActual.createElement(TextActual, { onPress }, children);
});

jest.mock('../../Base/StatusText', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: TextActual } = jest.requireActual('react-native');
  const StatusText = ({
    status,
    testID,
  }: {
    status: string;
    testID?: string;
  }) => ReactActual.createElement(TextActual, { testID }, status);
  return { __esModule: true, default: StatusText };
});

jest.mock('../Money/components/PendingSpinner/PendingSpinner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) =>
    ReactActual.createElement(View, { testID });
});

jest.mock('../Perps/components/PerpsTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({
    recyclingKey,
    size,
    symbol,
  }: {
    recyclingKey?: string;
    size?: number;
    symbol?: string;
  }) {
    return ReactActual.createElement(View, {
      testID: `perps-token-logo-${symbol}`,
      recyclingKey,
      size,
      symbol,
    });
  };
});

jest.mock('../../Views/confirmations/utils/transaction', () => ({
  hasGasFeeTokenSelected: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Helper to build minimal ActivityListItem
// ---------------------------------------------------------------------------

const makeItem = (
  overrides: Partial<{
    type: ActivityListItem['type'];
    chainId: string;
    status: Status;
    isEarliestNonce: boolean;
    hash: string;
    from: string;
    to: string;
    token?: object;
    sourceToken?: object;
    destinationToken?: object;
    transactionProtocol?: string;
  }>,
): ActivityListItem => {
  const type = overrides.type ?? 'send';
  const status = overrides.status ?? 'success';
  const base = {
    type,
    chainId: (overrides.chainId ?? 'eip155:1') as ActivityListItem['chainId'],
    status,
    timestamp: 1_700_000_000_000,
    hash: overrides.hash ?? '0xabc',
    isEarliestNonce: overrides.isEarliestNonce,
  };

  if (type === 'send' || type === 'receive') {
    return {
      ...base,
      type,
      data: {
        from: overrides.from ?? '0xfrom',
        to: overrides.to ?? '0xto',
        token: overrides.token as never,
      },
    } as unknown as ActivityListItem;
  }

  if (
    type === 'swap' ||
    type === 'bridge' ||
    type === 'convert' ||
    type === 'wrap' ||
    type === 'unwrap' ||
    type === 'lendingDeposit' ||
    type === 'lendingWithdrawal'
  ) {
    return {
      ...base,
      type,
      raw: overrides.transactionProtocol
        ? {
            type: 'apiEvmTransaction',
            data: {
              transactionProtocol: overrides.transactionProtocol,
            },
          }
        : undefined,
      data: {
        sourceToken: overrides.sourceToken as never,
        destinationToken: overrides.destinationToken as never,
      },
    } as unknown as ActivityListItem;
  }

  return {
    ...base,
    type,
    raw: overrides.transactionProtocol
      ? {
          type: 'apiEvmTransaction',
          data: {
            transactionProtocol: overrides.transactionProtocol,
          },
        }
      : undefined,
    data: {
      from: overrides.from ?? '0xfrom',
      to: overrides.to ?? '0xto',
      token: overrides.token as never,
    },
  } as unknown as ActivityListItem;
};

// ---------------------------------------------------------------------------
// Row content tests — mirrors extension ActivityRow title/subtitle/amount split
// ---------------------------------------------------------------------------

describe('ActivityListItemRow — row content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the activity item chain for the network badge', () => {
    const item = makeItem({
      type: 'send',
      chainId: 'eip155:59144',
      status: 'success',
      token: {
        amount: '10',
        symbol: 'USDC',
        direction: 'out',
      },
    });

    render(<ActivityListItemRow item={item} index={0} />);

    expect(getNetworkImageSource).toHaveBeenCalledWith({
      chainId: 'eip155:59144',
    });
  });

  it('renders send title, recipient subtitle, and signed primary amount', () => {
    const item = makeItem({
      type: 'send',
      status: 'success',
      to: '0x1234567890',
      token: {
        amount: '10',
        symbol: 'USDC',
        direction: 'out',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Sent USDC',
    );
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'To: 0x1234...',
    );
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '-10 USDC',
    );
    expect(getByTestId('avatar-token-USDC')).toBeOnTheScreen();
  });

  it('shows "Send cancelled" and hides the amount for a cancelled send', () => {
    const item = makeItem({
      type: 'send',
      status: 'cancelled',
      to: '0x1234567890',
      token: { amount: '10', symbol: 'USDC', direction: 'out' },
    });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Send cancelled',
    );
    // The amount is suppressed — a cancelled send moved nothing.
    expect(queryByTestId('activity-primary-amount-0xabc')).toBeNull();
    expect(queryByTestId('activity-secondary-amount-0xabc')).toBeNull();
  });

  it('shows "Send failed" and hides the amount for a failed send', () => {
    const item = makeItem({
      type: 'send',
      status: 'failed',
      to: '0x1234567890',
      token: { amount: '10', symbol: 'USDC', direction: 'out' },
    });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Send failed',
    );
    expect(queryByTestId('activity-primary-amount-0xabc')).toBeNull();
  });

  it('renders receive title, sender subtitle, and positive primary amount', () => {
    const item = makeItem({
      type: 'receive',
      status: 'success',
      from: '0xabcdef1234',
      token: {
        amount: '200.34',
        symbol: 'mUSD',
        direction: 'in',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Received mUSD',
    );
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'From: 0xabcd...',
    );
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '+200.34 mUSD',
    );
  });

  it('renders mUSD fiat using the stablecoin fallback when market rates are missing', () => {
    const item = makeItem({
      type: 'receive',
      chainId: 'eip155:59144',
      status: 'success',
      from: '0xabcdef1234',
      token: {
        amount: '200340000',
        symbol: 'mUSD',
        direction: 'in',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '+200.34 mUSD',
    );
    expect(getByTestId('activity-secondary-amount-0xabc').props.children).toBe(
      '+$200.34',
    );
  });

  it('renders swap title, token pair subtitle, primary and secondary amounts', () => {
    const item = makeItem({
      type: 'swap',
      status: 'success',
      transactionProtocol: 'Curve',
      sourceToken: {
        amount: '0.123',
        symbol: 'ETH',
        direction: 'out',
      },
      destinationToken: {
        amount: '300',
        symbol: 'USDT',
        direction: 'in',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe('Swapped');
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'ETH → USDT',
    );
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '+300 USDT',
    );
    expect(getByTestId('activity-secondary-amount-0xabc').props.children).toBe(
      '-0.123 ETH',
    );
    expect(getByTestId('avatar-token-ETH')).toBeOnTheScreen();
    expect(getByTestId('avatar-token-USDT')).toBeOnTheScreen();
  });

  it('falls back to the protocol subtitle for a swap missing one token symbol', () => {
    const item = makeItem({
      type: 'swap',
      status: 'success',
      transactionProtocol: 'ACROSS',
      destinationToken: {
        amount: '0.0002',
        symbol: 'ETH',
        direction: 'in',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe('Swapped');
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'Across',
    );
  });

  it('renders perps deposits with Perps balance subtitle, fiat primary, and token secondary', () => {
    const addFunds = makeItem({
      type: 'perpsAddFunds',
      status: 'success',
      hash: '0xperpsdep',
      token: { amount: '4000', symbol: 'USDC', direction: 'in' },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={addFunds} index={0} />,
    );

    expect(getByTestId('activity-title-0xperpsdep').props.children).toBe(
      strings('transactions.activity_perps_account_funded'),
    );
    expect(getByTestId('activity-subtitle-0xperpsdep').props.children).toBe(
      strings('transactions.activity_perps_balance'),
    );
    // Primary is fiat-style (USD, incoming sign); secondary is the token amount.
    const primary = getByTestId('activity-primary-amount-0xperpsdep').props
      .children as string;
    expect(primary.startsWith('+')).toBe(true);
    expect(primary).toContain('$');
    expect(
      getByTestId('activity-secondary-amount-0xperpsdep').props.children,
    ).toBe('4,000 USDC');
  });

  it('renders perps withdrawals with fiat primary and signed token secondary', () => {
    const withdrawFunds = makeItem({
      type: 'perpsWithdraw',
      status: 'success',
      hash: '0xperpswd',
      token: { amount: '4000', symbol: 'USDC', direction: 'out' },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={withdrawFunds} index={1} />,
    );

    expect(getByTestId('activity-title-0xperpswd').props.children).toBe(
      strings('transactions.activity_perps_withdrawal'),
    );
    expect(getByTestId('activity-subtitle-0xperpswd').props.children).toBe(
      strings('transactions.activity_perps_balance'),
    );
    const primary = getByTestId('activity-primary-amount-0xperpswd').props
      .children as string;
    expect(primary.startsWith('-')).toBe(true);
    expect(primary).toContain('$');
    expect(
      getByTestId('activity-secondary-amount-0xperpswd').props.children,
    ).toBe('-4,000 USDC');
  });

  it('renders the position size as the subtitle for perps trades', () => {
    const openLong = {
      type: 'perpsOpenLong',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xlong',
      data: {
        token: { amount: '4000', symbol: 'USD', direction: 'out' },
        sourceToken: { amount: '2.01', symbol: 'ETH', direction: 'in' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={openLong} index={0} />,
    );

    expect(getByTestId('activity-title-0xlong').props.children).toBe(
      strings('transactions.activity_perps_open_long'),
    );
    expect(getByTestId('activity-subtitle-0xlong').props.children).toBe(
      '2.01 ETH',
    );
    // Amount is fiat-style (USD), not token-style "4000 USD".
    const primary = getByTestId('activity-primary-amount-0xlong').props
      .children as string;
    expect(primary.startsWith('-')).toBe(true);
    expect(primary).toContain('$');
    // No secondary amount on trades — the position size is the subtitle.
    expect(queryByTestId('activity-secondary-amount-0xlong')).toBeNull();
  });

  it('uses PerpsTokenLogo for market avatars', () => {
    const openLong = {
      type: 'perpsOpenLong',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xicon',
      data: {
        token: { amount: '4000', symbol: 'USD', direction: 'out' },
        sourceToken: { amount: '2.01', symbol: 'BTC', direction: 'in' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={openLong} index={0} />,
    );

    const logo = getByTestId('perps-token-logo-BTC');
    expect(logo.props.recyclingKey).toBe('BTC');
    expect(logo.props.symbol).toBe('BTC');
    expect(logo.props.size).toBe(32);
  });

  it('passes k-prefixed perps market symbols to PerpsTokenLogo', () => {
    const openLong = {
      type: 'perpsOpenLong',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xkpepe',
      data: {
        token: { amount: '10', symbol: 'USD', direction: 'out' },
        sourceToken: { amount: '1000', symbol: 'kPEPE', direction: 'in' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={openLong} index={0} />,
    );

    const logo = getByTestId('perps-token-logo-kPEPE');
    expect(logo.props.recyclingKey).toBe('kPEPE');
    expect(logo.props.symbol).toBe('kPEPE');
    expect(logo.props.size).toBe(32);
  });

  it('gives liquidation, stop-loss, and neutral close titles distinct colors', () => {
    const { StyleSheet } = jest.requireActual('react-native');
    const makePerpsClose = (
      type: ActivityListItem['type'],
      hash: string,
    ): ActivityListItem =>
      ({
        type,
        chainId: 'eip155:42161',
        status: 'success',
        timestamp: 1_700_000_000_000,
        hash,
        data: {
          token: { amount: '300', symbol: 'USD', direction: 'out' },
          sourceToken: { amount: '2.01', symbol: 'ETH', direction: 'out' },
        },
      }) as unknown as ActivityListItem;

    const titleColor = (item: ActivityListItem, hash: string, index: number) =>
      StyleSheet.flatten(
        render(<ActivityListItemRow item={item} index={index} />).getByTestId(
          `activity-title-${hash}`,
        ).props.style,
      ).color;

    const neutral = titleColor(
      makePerpsClose('perpsCloseLong', '0xn'),
      '0xn',
      0,
    );
    const liquidated = titleColor(
      makePerpsClose('perpsCloseLongLiquidated', '0xliq'),
      '0xliq',
      1,
    );
    const stopLoss = titleColor(
      makePerpsClose('perpsCloseShortStopLoss', '0xsl'),
      '0xsl',
      2,
    );

    // Liquidation → error color, stop-loss → warning color, both distinct from
    // the neutral close title and from each other.
    expect(liquidated).not.toBe(neutral);
    expect(stopLoss).not.toBe(neutral);
    expect(liquidated).not.toBe(stopLoss);
  });

  const makeLimitOrder = (status: Status, hash: string): ActivityListItem =>
    ({
      type: 'limitShort',
      chainId: 'eip155:42161',
      status,
      timestamp: 1_700_000_000_000,
      hash,
      data: {
        token: { amount: '14', symbol: 'USD', direction: 'out' },
        sourceToken: { amount: '0.0002', symbol: 'BTC', direction: 'out' },
      },
    }) as unknown as ActivityListItem;

  const flattenColor = (node: ReactTestInstance) => {
    const { StyleSheet } = jest.requireActual('react-native');
    return StyleSheet.flatten(node.props.style).color;
  };

  it('keeps a cancelled order title neutral while still marking a failed one red', () => {
    const neutral = render(
      <ActivityListItemRow
        item={makeItem({
          type: 'send',
          status: 'success',
          token: { amount: '1', symbol: 'ETH', direction: 'out' },
        })}
        index={0}
      />,
    ).getByTestId('activity-title-0xabc');
    const cancelled = render(
      <ActivityListItemRow
        item={makeLimitOrder('cancelled', '0xcxl')}
        index={1}
      />,
    ).getByTestId('activity-title-0xcxl');
    const failed = render(
      <ActivityListItemRow
        item={makeLimitOrder('failed', '0xfail')}
        index={2}
      />,
    ).getByTestId('activity-title-0xfail');

    expect(flattenColor(cancelled)).toBe(flattenColor(neutral));
    expect(flattenColor(failed)).not.toBe(flattenColor(neutral));
    expect(cancelled.props.children).toBe(
      strings('transactions.activity_limit_short'),
    );
  });

  it('renders limit orders with the market logo, no network badge, and a status label (not a notional amount)', () => {
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow
        item={makeLimitOrder('cancelled', '0xlimit')}
        index={0}
      />,
    );

    // Single market logo — not the generic split two-token avatar.
    const logo = getByTestId('perps-token-logo-BTC');
    expect(logo.props.symbol).toBe('BTC');
    // Perps is single-network (Arbitrum) → no network badge is resolved.
    expect(getNetworkImageSource).not.toHaveBeenCalled();

    expect(queryByTestId('activity-secondary-amount-0xlimit')).toBeNull();
    expect(getByTestId('activity-primary-amount-0xlimit').props.children).toBe(
      strings('transactions.activity_order_status_canceled'),
    );
  });

  it.each([
    ['success', 'activity_order_status_filled'],
    ['cancelled', 'activity_order_status_canceled'],
    ['failed', 'activity_order_status_rejected'],
    ['pending', 'activity_order_status_open'],
  ] as const)(
    'shows the order status label "%s" in the right column instead of an amount',
    (status, i18nKey) => {
      const { getByTestId, queryByTestId } = render(
        <ActivityListItemRow
          item={makeLimitOrder(status, `0x${status}`)}
          index={0}
        />,
      );

      expect(queryByTestId(`activity-secondary-amount-0x${status}`)).toBeNull();
      expect(
        getByTestId(`activity-primary-amount-0x${status}`).props.children,
      ).toBe(strings(`transactions.${i18nKey}`));
    },
  );

  it('renders the order status muted (matches the extension TextMuted), distinct from a normal amount color', () => {
    const orderStatus = flattenColor(
      render(
        <ActivityListItemRow
          item={makeLimitOrder('success', '0xmuted')}
          index={0}
        />,
      ).getByTestId('activity-primary-amount-0xmuted'),
    );
    const normalAmount = flattenColor(
      render(
        <ActivityListItemRow
          item={makeItem({
            type: 'send',
            status: 'success',
            token: { amount: '1', symbol: 'ETH', direction: 'out' },
          })}
          index={1}
        />,
      ).getByTestId('activity-primary-amount-0xabc'),
    );

    // Muted status color is applied and differs from the default amount color.
    expect(orderStatus).not.toBe(normalAmount);
  });

  it.each([
    ['cancelled', 'transaction.canceled'],
    ['failed', 'transaction.failed'],
  ] as const)(
    'keeps the "— status" suffix on non-order domain rows (%s deposit)',
    (status, i18nKey) => {
      const { getByTestId } = render(
        <ActivityListItemRow
          item={makeItem({
            type: 'perpsAddFunds',
            status,
            hash: `0xfunds-${status}`,
          })}
          index={0}
        />,
      );

      // Unlike orders, funds/predict rows still carry the status in the title.
      expect(
        getByTestId(`activity-title-0xfunds-${status}`).props.children,
      ).toBe(
        `${strings('transactions.activity_perps_account_funded')} — ${strings(
          i18nKey,
        )}`,
      );
    },
  );

  it('colors a perps trade loss with the error color and a gain with the incoming color', () => {
    const makeClose = (
      direction: 'in' | 'out',
      hash: string,
    ): ActivityListItem =>
      ({
        type: 'perpsCloseLong',
        chainId: 'eip155:42161',
        status: 'success',
        timestamp: 1_700_000_000_000,
        hash,
        data: {
          token: { amount: '5', symbol: 'USD', direction },
          sourceToken: { amount: '2.01', symbol: 'ETH', direction: 'out' },
        },
      }) as unknown as ActivityListItem;

    const loss = render(
      <ActivityListItemRow item={makeClose('out', '0xloss')} index={0} />,
    ).getByTestId('activity-primary-amount-0xloss');
    const gain = render(
      <ActivityListItemRow item={makeClose('in', '0xgain')} index={1} />,
    ).getByTestId('activity-primary-amount-0xgain');

    // Loss shares the error color used for a failed title; gain shares the green
    // used for an incoming receive amount.
    const errorColor = flattenColor(
      render(
        <ActivityListItemRow
          item={makeLimitOrder('failed', '0xfailref')}
          index={3}
        />,
      ).getByTestId('activity-title-0xfailref'),
    );
    const incomingColor = flattenColor(
      render(
        <ActivityListItemRow
          item={makeItem({
            type: 'receive',
            status: 'success',
            token: { amount: '1', symbol: 'ETH', direction: 'in' },
          })}
          index={4}
        />,
      ).getByTestId('activity-primary-amount-0xabc'),
    );

    expect(flattenColor(loss)).toBe(errorColor);
    expect(flattenColor(gain)).toBe(incomingColor);
  });

  it('strips the HyperLiquid builder prefix from the trade subtitle', () => {
    const openLong = {
      type: 'perpsOpenLong',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xbuilder',
      data: {
        token: { amount: '0.02', symbol: 'USD', direction: 'out' },
        sourceToken: { amount: '0.002', symbol: 'xyz:GOLD', direction: 'in' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={openLong} index={0} />,
    );

    expect(getByTestId('activity-subtitle-0xbuilder').props.children).toBe(
      '0.002 GOLD',
    );
  });

  it('renders the market symbol as the subtitle for perps funding fees', () => {
    const funding = {
      type: 'perpsPaidFundingFees',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xfunding',
      data: {
        token: { amount: '0.0006', symbol: 'USD', direction: 'out' },
        sourceToken: { symbol: 'BTC', direction: 'out' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={funding} index={0} />,
    );

    expect(getByTestId('activity-subtitle-0xfunding').props.children).toBe(
      'BTC',
    );
    // Sub-cent funding fee keeps precision in currency format (not $0.00).
    const primary = getByTestId('activity-primary-amount-0xfunding').props
      .children as string;
    expect(primary.startsWith('-')).toBe(true);
    expect(primary).toContain('$');
    expect(primary).toContain('0.0006');
  });

  it('renders predict funds rows with balance subtitle, fiat primary, and token secondary', () => {
    const addFunds = {
      type: 'predictionsAddFunds',
      chainId: 'eip155:137',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xpredictdep',
      data: {
        token: { amount: '4000', symbol: 'USDC', direction: 'in' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={addFunds} index={0} />,
    );

    expect(getByTestId('activity-title-0xpredictdep').props.children).toBe(
      strings('transactions.activity_prediction_account_funded'),
    );
    expect(getByTestId('activity-subtitle-0xpredictdep').props.children).toBe(
      strings('transactions.activity_predictions_balance'),
    );
    const primary = getByTestId('activity-primary-amount-0xpredictdep').props
      .children as string;
    expect(primary.startsWith('+')).toBe(true);
    expect(primary).toContain('$');
    expect(
      getByTestId('activity-secondary-amount-0xpredictdep').props.children,
    ).toBe('4,000 USDC');
  });

  it('appends a spaced em-dash "Failed" suffix to a failed domain (predict) row title', () => {
    const failedWithdraw = {
      type: 'predictionsWithdrawFunds',
      chainId: 'eip155:137',
      status: 'failed',
      timestamp: 1_700_000_000_000,
      hash: '0xpredictwdfailed',
      data: {
        token: {
          amount: '1000000',
          symbol: 'USDC',
          decimals: 6,
          direction: 'out',
        },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={failedWithdraw} index={0} />,
    );

    expect(getByTestId('activity-title-0xpredictwdfailed').props.children).toBe(
      `${strings('transactions.activity_prediction_withdrawal')} — ${strings(
        'transaction.failed',
      )}`,
    );
  });

  it('renders predict rows with market subtitle, fiat amount, and market icon', () => {
    const placed = {
      type: 'predictionPlaced',
      chainId: 'eip155:137',
      status: 'success',
      timestamp: 1_700_000_000_000,
      raw: {
        type: 'predictActivity',
        data: {
          id: 'p1',
          providerId: 'polymarket',
          title: 'Will Spain win the 2026 FIFA World Cup?',
          icon: 'https://example.com/spain.png',
          entry: { type: 'buy', timestamp: 1, amount: 3 },
        },
      },
      hash: 'predict-1',
      data: {
        token: { amount: '3', symbol: 'USDC', direction: 'out' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={placed} index={0} />,
    );

    expect(getByTestId('activity-title-predict-1').props.children).toBe(
      strings('transactions.activity_prediction_placed'),
    );
    expect(getByTestId('activity-subtitle-predict-1').props.children).toBe(
      'Will Spain win the 2026 FIFA World Cup?',
    );
    const primary = getByTestId('activity-primary-amount-predict-1').props
      .children as string;
    expect(primary.startsWith('-')).toBe(true);
    expect(primary).toContain('$');
  });

  it('renders very small funding fees in subscript notation', () => {
    const funding = {
      type: 'perpsPaidFundingFees',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xtiny',
      data: {
        token: { amount: '0.00005', symbol: 'USD', direction: 'out' },
        sourceToken: { symbol: 'BTC', direction: 'out' },
      },
    } as unknown as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={funding} index={0} />,
    );

    // 0.00005 → subscript notation "$0.0₄5" (4 leading zeros).
    const primary = getByTestId('activity-primary-amount-0xtiny').props
      .children as string;
    expect(primary).toContain('₄');
    expect(primary).toContain('$');
    expect(primary.startsWith('-')).toBe(true);
  });

  it('renders spending cap rows with token subtitle and no empty amount', () => {
    const item = makeItem({
      type: 'approveSpendingCap',
      status: 'success',
      token: {
        symbol: 'USDC',
        direction: 'out',
      },
    });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Approved spending cap',
    );
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe('USDC');
    expect(queryByTestId('activity-primary-amount-0xabc')).toBeNull();
  });

  it('renders spending cap amount without an outgoing sign', () => {
    const item = makeItem({
      type: 'approveSpendingCap',
      status: 'success',
      token: {
        amount: '100000000',
        decimals: 6,
        symbol: 'USDC',
        direction: 'out',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '100 USDC',
    );
  });

  it('renders unlimited spending cap amount without compacting the raw allowance', () => {
    const item = makeItem({
      type: 'approveSpendingCap',
      status: 'success',
      token: {
        amount: '115792089237316195423570985.639935',
        isUnlimitedApproval: true,
        symbol: 'USDT',
        direction: 'out',
      },
    });

    const { getByTestId, queryByText } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      `${strings('confirm.unlimited')} USDT`,
    );
    expect(queryByText('115792089237316195423570985.639935 USDT')).toBeNull();
  });

  it('resolves a spending-cap token symbol/decimals from the tokens API', () => {
    const assetId = 'eip155:1/erc20:0x0000000000000000000000000000000000000001';
    jest.mocked(useTokensData).mockReturnValue({
      [assetId]: {
        assetId,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        iconUrl: '',
      },
    });

    // Token from the adapter carries only the asset id (no symbol/decimals).
    const item = makeItem({
      type: 'approveSpendingCap',
      status: 'success',
      token: { amount: '100000000', direction: 'out', assetId },
    });

    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '100 USDC',
    );
    expect(getByTestId('avatar-token-USDC')).toBeOnTheScreen();

    jest.mocked(useTokensData).mockReturnValue({});
  });

  it('resolves a lending-deposit token symbol/decimals from the tokens API and scales the amount', () => {
    const assetId =
      'eip155:42161/erc20:0x0000000000000000000000000000000000000002';
    jest.mocked(useTokensData).mockReturnValue({
      [assetId]: {
        assetId,
        symbol: 'USDT',
        decimals: 6,
        name: 'Tether USD',
        iconUrl: '',
      },
    });

    // The adapter carries only the atomic amount + asset id (the tx targets the
    // pool, so symbol/decimals aren't in local metadata). Without decimals the
    // amount would render unscaled (10,000 instead of 0.01).
    const item = makeItem({
      type: 'lendingDeposit',
      status: 'success',
      chainId: 'eip155:42161',
      sourceToken: { amount: '10000', direction: 'out', assetId },
    });

    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '-0.01 USDT',
    );
    expect(getByTestId('avatar-token-USDT')).toBeOnTheScreen();

    jest.mocked(useTokensData).mockReturnValue({});
  });

  it('renders a lending-deposit amount from adapter-provided decimals without an API lookup', () => {
    // When the adapter already resolved symbol/decimals, the row scales the
    // amount without depending on the tokens API (which returns nothing here).
    const item = makeItem({
      type: 'lendingDeposit',
      status: 'success',
      sourceToken: {
        amount: '10000',
        decimals: 6,
        symbol: 'USDC',
        direction: 'out',
      },
    });

    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '-0.01 USDC',
    );
  });

  it('renders a cross-token bridge as bridged on the destination token, not swapped', () => {
    // A bridge that also changes the token (e.g. ETH → USDT) is still a bridge,
    // never "Swapped". Without bridge history the route is unknown, so the
    // subtitle falls back to the token pair.
    const item = makeItem({
      type: 'bridge',
      status: 'success',
      sourceToken: {
        amount: '0.123',
        symbol: 'ETH',
        direction: 'out',
      },
      destinationToken: {
        amount: '300',
        symbol: 'USDT',
        direction: 'in',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Bridged USDT',
    );
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'ETH → USDT',
    );
    expect(getByTestId('avatar-token-ETH')).toBeOnTheScreen();
    expect(getByTestId('avatar-token-USDT')).toBeOnTheScreen();
  });

  it('renders bridge route and destination amount from bridge history', () => {
    const item = makeItem({
      type: 'bridge',
      status: 'success',
      sourceToken: {
        amount: '5100000',
        decimals: 6,
        symbol: 'USDC',
        direction: 'out',
      },
    });
    const bridgeHistoryItem = {
      quote: {
        srcChainId: 1,
        destChainId: 59144,
        srcTokenAmount: '5100000',
        srcAsset: {
          assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
          symbol: 'USDC',
        },
        destTokenAmount: '5090000',
        destAsset: {
          assetId:
            'eip155:59144/erc20:0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
          decimals: 6,
          symbol: 'USDC',
        },
      },
    };

    const { getAllByTestId, getByTestId } = render(
      <ActivityListItemRow
        bridgeHistoryItem={bridgeHistoryItem as never}
        item={item}
        index={0}
      />,
    );

    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'Ethereum → Linea',
    );
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '-5.1 USDC',
    );
    expect(getByTestId('activity-secondary-amount-0xabc').props.children).toBe(
      '+5.09 USDC',
    );
    expect(getAllByTestId('avatar-token-USDC')).toHaveLength(1);
  });

  it('renders a non-EVM cross-chain bridge as bridged with the network route', () => {
    const item = makeItem({
      type: 'bridge',
      status: 'success',
      sourceToken: {
        amount: '9912000',
        decimals: 9,
        symbol: 'SOL',
        direction: 'out',
      },
    });
    const bridgeHistoryItem = {
      quote: {
        srcChainId: SolScope.Mainnet,
        destChainId: 1,
        srcTokenAmount: '9912000',
        srcAsset: {
          assetId: `${SolScope.Mainnet}/slip44:501`,
          decimals: 9,
          symbol: 'SOL',
        },
        destTokenAmount: '368300000000000',
        destAsset: {
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          symbol: 'ETH',
        },
      },
    };

    const { getByTestId } = render(
      <ActivityListItemRow
        bridgeHistoryItem={bridgeHistoryItem as never}
        item={item}
        index={0}
      />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Bridged ETH',
    );
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'Solana → Ethereum',
    );
  });

  it('renders source-only API bridge rows as sends when bridge history is unavailable', () => {
    const item = makeItem({
      type: 'bridge',
      status: 'success',
      sourceToken: {
        amount: '5000000',
        decimals: 6,
        symbol: 'USDC',
        direction: 'out',
      },
    });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Sent USDC',
    );
    expect(queryByTestId('activity-subtitle-0xabc')).toBeNull();
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '-5 USDC',
    );
    expect(queryByTestId('activity-secondary-amount-0xabc')).toBeNull();
  });

  it('does not render technical protocol values as subtitles', () => {
    const item = makeItem({
      type: 'deposit',
      status: 'success',
      transactionProtocol: 'GNOSIS_SAFE',
      token: {
        amount: '1',
        symbol: 'USDC',
        direction: 'in',
      },
    });
    const { queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(queryByTestId('activity-subtitle-0xabc')).toBeNull();
  });

  it('does not render contract subtitle when the contract address is missing', () => {
    const item = makeItem({
      type: 'contractInteraction',
      status: 'success',
      to: '',
    });
    const { queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(queryByTestId('activity-subtitle-0xabc')).toBeNull();
  });

  it('renders user-facing protocol for contract interactions when available', () => {
    const item = makeItem({
      type: 'contractInteraction',
      status: 'success',
      transactionProtocol: 'ACROSS',
      to: '0xabcdef1234',
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'Across',
    );
  });

  it('renders lending withdrawal title and amount from the destination token', () => {
    const item = makeItem({
      type: 'lendingWithdrawal',
      status: 'success',
      sourceToken: {
        amount: '200',
        symbol: 'aLinUSDC',
        direction: 'out',
      },
      destinationToken: {
        amount: '200',
        symbol: 'USDC',
        direction: 'in',
      },
    });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      `${strings('transactions.tx_review_lending_withdraw')} USDC`,
    );
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '+200 USDC',
    );
    expect(getByTestId('avatar-token-USDC')).toBeOnTheScreen();
    expect(queryByTestId('avatar-token-aLinUSDC')).toBeNull();
  });

  it('renders nameless NFT buys as Bought NFT without a primary amount', () => {
    const item = makeItem({
      type: 'nftBuy',
      status: 'success',
      token: {
        direction: 'in',
      },
    });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Bought NFT',
    );
    expect(queryByTestId('activity-primary-amount-0xabc')).toBeNull();
  });

  it('renders a named NFT buy with the collection name and the amount paid', () => {
    const item: ActivityListItem = {
      type: 'nftBuy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xabc',
      data: {
        from: '0xseller',
        to: '0xbuyer',
        token: {
          direction: 'in',
          symbol: 'FLUF World: Scenes and Sounds',
        },
        paymentToken: {
          amount: '89990000000000',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
          assetId: 'eip155:1/slip44:60',
        },
      },
    } as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Bought FLUF World: Scenes and Sounds',
    );
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '-0.00008999 ETH',
    );
  });

  it('renders a named NFT sale with the collection name and the amount received', () => {
    const item: ActivityListItem = {
      type: 'nftSell',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xabc',
      data: {
        from: '0xseller',
        to: '0xrecipient',
        token: { direction: 'out', symbol: 'BAE' },
        paymentToken: {
          amount: '1000000000000000',
          decimals: 18,
          direction: 'in',
          symbol: 'ETH',
          assetId: 'eip155:1/slip44:60',
        },
      },
    } as ActivityListItem;

    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe('Sold BAE');
    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '+0.001 ETH',
    );
  });

  it('shortens long crypto decimals in token amounts', () => {
    const item = makeItem({
      type: 'send',
      status: 'success',
      token: {
        amount: '0.123456789',
        symbol: 'ETH',
        direction: 'out',
      },
    });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    const primaryAmount = getByTestId('activity-primary-amount-0xabc');
    expect(primaryAmount.props.children).toBe('-0.1235 ETH');
    expect(primaryAmount.props.numberOfLines).toBe(1);
    expect(primaryAmount.props.ellipsizeMode).toBe('tail');
  });

  it('compacts large token amounts before rendering', () => {
    const item = makeItem({
      type: 'receive',
      status: 'success',
      token: {
        symbol: 'USDC',
        amount: '2500000000000000',
        decimals: 6,
        direction: 'in',
      },
    });

    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByTestId('activity-primary-amount-0xabc').props.children).toBe(
      '+2.5B USDC',
    );
  });
});

describe('ActivityListItemRow — display currency conversion', () => {
  const mockCurrency = jest.mocked(selectCurrentCurrency);
  const mockConversionRate = jest.mocked(selectConversionRateByChainId);
  const mockUsdConversionRate = jest.mocked(selectUSDConversionRateByChainId);

  // These selector mocks use persistent return values (clearAllMocks does not
  // reset them), so restore the suite-wide defaults (USD, equal rates) after
  // each test to keep overrides from leaking.
  afterEach(() => {
    jest.clearAllMocks();
    mockCurrency.mockReturnValue('usd');
    mockConversionRate.mockReturnValue(2500);
    mockUsdConversionRate.mockReturnValue(2500);
  });

  const makeFundingFee = (hash: string, amount: string): ActivityListItem =>
    ({
      type: 'perpsPaidFundingFees',
      chainId: 'eip155:42161',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash,
      data: {
        token: { amount, symbol: 'USD', direction: 'out' },
        sourceToken: { symbol: 'BTC', direction: 'out' },
      },
    }) as unknown as ActivityListItem;

  it('converts a USD-denominated amount into the user display currency', () => {
    // Native→EUR 2300, Native→USD 2500 → USD→display factor 0.92.
    mockCurrency.mockReturnValue('eur');
    mockConversionRate.mockReturnValue(2300);
    mockUsdConversionRate.mockReturnValue(2500);

    const { getByTestId } = render(
      <ActivityListItemRow
        item={makeFundingFee('0xeurfunding', '1')}
        index={0}
      />,
    );

    const primary = getByTestId('activity-primary-amount-0xeurfunding').props
      .children as string;
    expect(primary.startsWith('-')).toBe(true);
    // 1 USD × (2300 / 2500) = 0.92 in the user's currency, not the raw $1.
    expect(primary).toContain('0.92');
    expect(primary).not.toContain('$');
  });

  it('omits the domain fiat for a non-USD user when rates are unavailable', () => {
    // No rates to convert with: rather than mislabel a USD figure with another
    // currency's symbol, the domain fiat is dropped and the row falls back to
    // the raw token amount.
    mockCurrency.mockReturnValue('eur');
    mockConversionRate.mockReturnValue(undefined);
    mockUsdConversionRate.mockReturnValue(undefined);

    const { getByTestId } = render(
      <ActivityListItemRow
        item={makeFundingFee('0xnorate', '0.0006')}
        index={0}
      />,
    );

    const primary = getByTestId('activity-primary-amount-0xnorate').props
      .children as string;
    expect(primary).not.toContain('$');
    expect(primary).not.toContain('€');
    expect(primary).toContain('0.0006');
    expect(primary).toContain('USD');
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

  it('does not render destination fiat as the source line for source-less swaps', () => {
    const item = makeItem({
      type: 'swap',
      status: 'success',
      destinationToken: {
        amount: '1000000',
        decimals: 6,
        symbol: 'mUSD',
        assetId: `eip155:1/erc20:${LINEA_MUSD_ADDRESS}`,
        direction: 'in',
      },
    });

    const { getByText, queryByText } = render(
      <ActivityListItemRow item={item} index={0} />,
    );

    expect(getByText('+1 mUSD')).toBeOnTheScreen();
    expect(queryByText('+$1')).toBeNull();
  });
});

describe('ActivityListItemRow — ERC-20 fiat address casing (TMCU-937)', () => {
  const mockContractExchangeRates = jest.mocked(
    selectContractExchangeRatesByChainId,
  );
  const USDC_LOWER = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const USDC_CHECKSUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  const ratesFor = (address: string) =>
    ({ [address]: { price: 0.0004 } }) as ReturnType<
      typeof selectContractExchangeRatesByChainId
    >;

  // This mock uses a persistent return value (clearAllMocks does not reset it),
  // so restore the suite default (lowercased mUSD key) after each test.
  afterEach(() => {
    jest.clearAllMocks();
    mockContractExchangeRates.mockReturnValue(ratesFor(LINEA_MUSD_ADDRESS));
  });

  it('renders fiat for an ERC-20 when market data is keyed by a checksummed address', () => {
    // Production keys marketData by checksummed addresses while the lookup
    // address is lowercased (CAIP asset references). The fiat line must still
    // resolve. Regression guard for the missing-ERC-20-fiat bug.
    mockContractExchangeRates.mockReturnValue(ratesFor(USDC_CHECKSUM));

    const item = makeItem({
      status: 'success',
      token: {
        amount: '1000000',
        decimals: 6,
        symbol: 'USDC',
        assetId: `eip155:1/erc20:${USDC_LOWER}`,
        direction: 'in',
      },
    });

    const { getByText } = render(<ActivityListItemRow item={item} index={0} />);

    expect(getByText('+1 USDC')).toBeOnTheScreen();
    expect(getByText('+$1')).toBeOnTheScreen();
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
  'stake',
  'unstake',
  'convert',
  'wrap',
  'unwrap',
  'approveSpendingCap',
  'revokeSpendingCap',
  'increaseSpendingCap',
  'lendingDeposit',
  'lendingWithdrawal',
  'nftBuy',
  'nftMint',
  'nftSell',
  'contractInteraction',
  'contractDeployment',
  'smartAccountUpgrade',
  'predictionsAddFunds',
  'predictionsWithdrawFunds',
  'predictionClaimWinnings',
  'predictionCashedOut',
  'predictionPlaced',
  'perpsAddFunds',
  'perpsWithdraw',
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
  'limitShort',
  'limitCloseShort',
  'marketLong',
  'stopMarketCloseLong',
  'marketCloseLong',
  'limitLong',
  'limitCloseLong',
  'assetActivation',
  'assetDeactivation',
];

const EXPECTED_TITLES = {
  send: strings('transactions.sent'),
  receive: strings('transactions.received'),
  swap: 'Swapped',
  swapIncomplete: 'Swapped',
  bridge: 'Bridged',
  buy: 'Bought',
  sell: 'Sold',
  claim: 'Claimed',
  claimMusdBonus: strings('transactions.activity_claim_musd_bonus'),
  deposit: 'Deposited',
  stake: 'Staked Ethereum',
  unstake: 'Unstaked Ethereum',
  convert: 'Converted',
  wrap: strings('transactions.activity_wrap'),
  unwrap: strings('transactions.activity_unwrap'),
  approveSpendingCap: 'Approved spending cap',
  revokeSpendingCap: strings('transactions.activity_revoke_spending_cap'),
  increaseSpendingCap: 'Increased spending cap',
  lendingDeposit: strings('transactions.tx_review_lending_deposit'),
  lendingWithdrawal: strings('transactions.tx_review_lending_withdraw'),
  nftBuy: 'Bought NFT',
  nftMint: strings('transactions.activity_nft_mint'),
  nftSell: 'Sold NFT',
  contractInteraction: strings('transactions.smart_contract_interaction'),
  contractDeployment: strings('transactions.tx_review_contract_deployment'),
  smartAccountUpgrade: 'Smart account upgraded',
  predictionsAddFunds: strings(
    'transactions.activity_prediction_account_funded',
  ),
  predictionsWithdrawFunds: strings(
    'transactions.activity_prediction_withdrawal',
  ),
  predictionClaimWinnings: strings('predict.transactions.claim_title'),
  predictionCashedOut: strings('predict.transactions.sell_title'),
  predictionPlaced: strings('transactions.activity_prediction_placed'),
  perpsAddFunds: strings('transactions.activity_perps_account_funded'),
  perpsWithdraw: strings('transactions.activity_perps_withdrawal'),
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
  limitShort: strings('transactions.activity_limit_short'),
  limitCloseShort: strings('transactions.activity_limit_close_short'),
  marketLong: strings('transactions.activity_market_long'),
  stopMarketCloseLong: strings('transactions.activity_stop_market_close_long'),
  marketCloseLong: strings('transactions.activity_market_close_long'),
  limitLong: strings('transactions.activity_limit_long'),
  limitCloseLong: strings('transactions.activity_limit_close_long'),
  assetActivation: strings('transactions.activity_trustline_activated'),
  assetDeactivation: strings('transactions.activity_trustline_deactivated'),
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

// ---------------------------------------------------------------------------
// getLocalTransactionStatus exhaustiveness test
// ---------------------------------------------------------------------------

describe('getLocalTransactionStatus — all local transaction status paths', () => {
  const { getLocalTransactionStatus } = jest.requireActual(
    '../../../util/activity-adapters/adapters/helpers',
  );
  const { TransactionStatus } = jest.requireActual(
    '@metamask/transaction-controller',
  );

  const makeGroup = (overrides: Record<string, unknown>) => ({
    primaryTransaction: {
      txReceipt: {},
      type: 'simpleSend',
      status: 'submitted',
      ...overrides,
    },
    initialTransaction: {
      isSmartTransaction: false,
      txParams: {},
      ...overrides,
    },
  });

  it('maps confirmed → success', () => {
    const group = makeGroup({ status: TransactionStatus.confirmed });
    expect(getLocalTransactionStatus(group)).toBe('success');
  });

  it('maps failed → failed', () => {
    const group = makeGroup({ status: TransactionStatus.failed });
    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps dropped → failed', () => {
    const group = makeGroup({ status: TransactionStatus.dropped });
    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps rejected → failed', () => {
    const group = makeGroup({ status: TransactionStatus.rejected });
    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps a confirmed cancel-type tx → cancelled (not failed)', () => {
    const group = makeGroup({
      status: TransactionStatus.confirmed,
      type: 'cancel',
    });
    expect(getLocalTransactionStatus(group)).toBe('cancelled');
  });

  it('maps submitted → pending', () => {
    const group = makeGroup({ status: TransactionStatus.submitted });
    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps approved → pending', () => {
    const group = makeGroup({ status: TransactionStatus.approved });
    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps unapproved → pending', () => {
    const group = makeGroup({ status: TransactionStatus.unapproved });
    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps signed → pending', () => {
    const group = makeGroup({ status: TransactionStatus.signed });
    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps receipt status 0x0 (revert) → failed', () => {
    const group = makeGroup({
      status: TransactionStatus.confirmed,
      txReceipt: { status: '0x0' },
    });
    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps smart tx pending → pending', () => {
    const group = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        isSmartTransaction: true,
        status: 'pending',
      },
    };
    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps smart tx success → success', () => {
    const group = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        isSmartTransaction: true,
        status: 'success',
      },
    };
    expect(getLocalTransactionStatus(group)).toBe('success');
  });

  it('maps smart tx cancelled → failed', () => {
    const group = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        isSmartTransaction: true,
        status: 'cancelled',
      },
    };
    expect(getLocalTransactionStatus(group)).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// Pending rows — spinner on title, queued subtitle prefix, no inline actions
// ---------------------------------------------------------------------------

interface MakePendingLocalItemOptions {
  txStatus?: string;
  isEarliestNonce?: boolean;
}

const makePendingLocalItem = ({
  txStatus = 'submitted',
  isEarliestNonce = true,
}: MakePendingLocalItemOptions = {}): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'pending',
    timestamp: 1_700_000_000_000,
    hash: '0xabc',
    isEarliestNonce,
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: {
          id: 'tx-1',
          status: txStatus,
        },
      },
    },
    data: {
      from: '0xfrom',
      to: '0x1234567890',
      token: { amount: '1', symbol: 'ETH', direction: 'out' },
    },
  }) as unknown as ActivityListItem;

const makePendingRemoteItem = (): ActivityListItem =>
  ({
    type: 'receive',
    chainId: 'eip155:1',
    status: 'pending',
    timestamp: 1_700_000_000_000,
    hash: '0xdef',
    data: {
      from: '0xfrom',
      to: '0xto',
      token: { amount: '1', symbol: 'ETH', direction: 'in' },
    },
  }) as unknown as ActivityListItem;

const pendingHandlers = () => ({
  onSpeedUpAction: jest.fn(),
  onCancelAction: jest.fn(),
  signQRTransaction: jest.fn(),
  signLedgerTransaction: jest.fn(),
  cancelUnsignedQRTransaction: jest.fn(),
});

describe('ActivityListItemRow — pending rows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the pending title, spinner, and normal subtitle', () => {
    const item = makePendingLocalItem({ txStatus: 'submitted' });
    const { getByTestId } = render(
      <ActivityListItemRow item={item} index={0} {...pendingHandlers()} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Sending ETH',
    );
    expect(getByTestId('activity-pending-spinner-0xabc')).toBeOnTheScreen();
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      'To: 0x1234...',
    );
  });

  it('renders queued rows with an hourglass prefix and no title spinner', () => {
    const item = makePendingLocalItem({ isEarliestNonce: false });
    const { getByTestId, queryByTestId } = render(
      <ActivityListItemRow item={item} index={0} {...pendingHandlers()} />,
    );

    expect(getByTestId('activity-title-0xabc').props.children).toBe(
      'Sending ETH',
    );
    expect(queryByTestId('activity-pending-spinner-0xabc')).toBeNull();
    expect(getByTestId('activity-subtitle-0xabc').props.children).toBe(
      `${strings('transaction.queued')} • To: 0x1234...`,
    );
  });

  it('does not render speed-up or cancel actions for pending rows', () => {
    const item = makePendingLocalItem({ txStatus: 'submitted' });
    const { queryByText } = render(
      <ActivityListItemRow item={item} index={0} {...pendingHandlers()} />,
    );

    expect(queryByText(strings('transaction.speedup'))).toBeNull();
    expect(queryByText(strings('transaction.cancel'))).toBeNull();
  });

  it('shows a spinner and normal subtitle for non-local pending rows', () => {
    const item = makePendingRemoteItem();
    const { getByTestId, queryByText } = render(
      <ActivityListItemRow item={item} index={0} {...pendingHandlers()} />,
    );

    expect(getByTestId('activity-pending-spinner-0xdef')).toBeOnTheScreen();
    expect(getByTestId('activity-subtitle-0xdef').props.children).toBe(
      'From: 0xfrom...',
    );
    expect(queryByText(strings('transaction.speedup'))).toBeNull();
    expect(queryByText(strings('transaction.cancel'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pending row actions — speed-up/cancel and hardware signing gates
// ---------------------------------------------------------------------------

type PendingActionsProps = React.ComponentProps<
  typeof ActivityListItemRowPendingActions
>;

const pendingActionStyles = {
  pendingActions: {},
  actionContainerStyle: {},
  speedupActionContainerStyle: {},
  actionStyle: {},
} as PendingActionsProps['styles'];

const makePendingActionTx = (
  overrides: Partial<TransactionMeta & { isSmartTransaction?: boolean }> = {},
) =>
  ({
    id: 'tx-1',
    status: TransactionStatus.submitted,
    type: TransactionType.simpleSend,
    ...overrides,
  }) as unknown as TransactionMeta;

const makePendingActionProps = (
  overrides: Partial<PendingActionsProps> = {},
): PendingActionsProps => ({
  tx: makePendingActionTx(),
  styles: pendingActionStyles,
  isQRHardwareAccount: false,
  isLedgerAccount: false,
  onSpeedUpAction: jest.fn(),
  onCancelAction: jest.fn(),
  signQRTransaction: jest.fn(),
  signLedgerTransaction: jest.fn(),
  cancelUnsignedQRTransaction: jest.fn(),
  ...overrides,
});

describe('ActivityListItemRowPendingActions', () => {
  const mockHasGasFeeTokenSelected = jest.mocked(hasGasFeeTokenSelected);

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasGasFeeTokenSelected.mockReturnValue(false);
  });

  it('renders speed-up and cancel actions for submitted transactions', () => {
    const props = makePendingActionProps();
    const { getByText } = render(
      <ActivityListItemRowPendingActions {...props} />,
    );

    fireEvent.press(getByText(strings('transaction.speedup')));
    fireEvent.press(getByText(strings('transaction.cancel')));

    expect(props.onSpeedUpAction).toHaveBeenCalledWith(true, props.tx);
    expect(props.onCancelAction).toHaveBeenCalledWith(true, props.tx);
  });

  it('renders normal actions for approved software-account transactions', () => {
    const props = makePendingActionProps({
      tx: makePendingActionTx({ status: TransactionStatus.approved }),
    });
    const { getByText } = render(
      <ActivityListItemRowPendingActions {...props} />,
    );

    expect(getByText(strings('transaction.speedup'))).toBeOnTheScreen();
    expect(getByText(strings('transaction.cancel'))).toBeOnTheScreen();
  });

  it('renders QR signing and QR cancel actions for approved QR hardware transactions', () => {
    const props = makePendingActionProps({
      isQRHardwareAccount: true,
      tx: makePendingActionTx({ status: TransactionStatus.approved }),
    });
    const { getByText, queryByText } = render(
      <ActivityListItemRowPendingActions {...props} />,
    );

    expect(queryByText(strings('transaction.speedup'))).toBeNull();

    fireEvent.press(getByText(strings('transaction.sign_with_keystone')));
    fireEvent.press(getByText(strings('transaction.cancel')));

    expect(props.signQRTransaction).toHaveBeenCalledWith(props.tx);
    expect(props.cancelUnsignedQRTransaction).toHaveBeenCalledWith(props.tx);
  });

  it('renders Ledger signing action for approved Ledger transactions', () => {
    const props = makePendingActionProps({
      isLedgerAccount: true,
      tx: makePendingActionTx({
        id: 'ledger-tx',
        status: TransactionStatus.approved,
      }),
    });
    const { getByText, queryByText } = render(
      <ActivityListItemRowPendingActions {...props} />,
    );

    expect(queryByText(strings('transaction.speedup'))).toBeNull();
    expect(queryByText(strings('transaction.cancel'))).toBeNull();

    fireEvent.press(getByText(strings('transaction.sign_with_ledger')));

    expect(props.signLedgerTransaction).toHaveBeenCalledWith({
      id: 'ledger-tx',
    });
  });

  it.each([
    ['smart transaction', makePendingActionTx({ isSmartTransaction: true })],
    [
      'bridge transaction',
      makePendingActionTx({ type: TransactionType.bridge }),
    ],
    [
      'unapproved transaction',
      makePendingActionTx({ status: TransactionStatus.unapproved }),
    ],
  ])('renders nothing for %s', (_description, tx) => {
    const { queryByText } = render(
      <ActivityListItemRowPendingActions
        {...makePendingActionProps({
          tx,
        })}
      />,
    );

    expect(queryByText(strings('transaction.speedup'))).toBeNull();
    expect(queryByText(strings('transaction.cancel'))).toBeNull();
    expect(queryByText(strings('transaction.sign_with_keystone'))).toBeNull();
    expect(queryByText(strings('transaction.sign_with_ledger'))).toBeNull();
  });

  it('renders nothing when a gas fee token is selected', () => {
    mockHasGasFeeTokenSelected.mockReturnValue(true);

    const { queryByText } = render(
      <ActivityListItemRowPendingActions {...makePendingActionProps()} />,
    );

    expect(queryByText(strings('transaction.speedup'))).toBeNull();
    expect(queryByText(strings('transaction.cancel'))).toBeNull();
  });
});

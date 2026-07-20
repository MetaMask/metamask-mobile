import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import Routes from '../../../../constants/navigation/Routes';
import { getProviderName } from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../util/networks';
import ClipboardManager from '../../../../core/ClipboardManager';
import { mapRampOrder } from '../../../../util/activity-adapters';
import { useAccountNames } from '../../../hooks/DisplayName/useAccountNames';
import { RampDetails, type RampActivityListItem } from './RampDetails';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getProviderName: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(() => ({})),
}));

jest.mock('../../../hooks/DisplayName/useAccountNames', () => ({
  useAccountNames: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
  findBlockExplorerUrlForChain: jest.fn(),
  getBlockExplorerTxUrl: jest.fn(),
}));

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ...actual,
    AvatarToken: ({ name }: { name?: string }) =>
      ReactActual.createElement(Text, null, name),
    AvatarAccount: ({ address }: { address?: string }) =>
      ReactActual.createElement(Text, null, address),
    BadgeNetwork: () => ReactActual.createElement(Text, null, 'network'),
    BadgeWrapper: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

const baseOrder: FiatOrder = {
  id: '0d13232233944',
  provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
  createdAt: Date.UTC(2025, 11, 10, 10, 34),
  amount: '6.27',
  fee: '1.26',
  cryptoAmount: '5.01',
  currency: 'USD',
  cryptocurrency: 'mUSD',
  state: FIAT_ORDER_STATES.COMPLETED,
  account: '0x232123456789abcdef123456789abcdef12321',
  network: '1',
  txHash: '0x232123456789abcdef123456789abcdef12321',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: {},
} as FiatOrder;

function makeItem(order: FiatOrder): RampActivityListItem {
  return mapRampOrder({ order }) as RampActivityListItem;
}

function arrange() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigate: mockNavigate,
  });
  (useSelector as unknown as jest.Mock).mockImplementation((selector) =>
    selector({ settings: {} }),
  );
  (getProviderName as jest.Mock).mockReturnValue('Mercuryo');
  (useAccountNames as jest.Mock).mockReturnValue(['Defi account']);
  (findBlockExplorerUrlForChain as jest.Mock).mockReturnValue(
    'https://etherscan.io',
  );
  (getBlockExplorerTxUrl as jest.Mock).mockReturnValue({
    url: 'https://etherscan.io/tx/0xhash',
    title: 'etherscan.io',
  });
}

describe('RampDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrange();
  });

  it('renders a buy/deposit style details view', () => {
    const { getByText, queryByText } = render(
      <RampDetails item={makeItem(baseOrder)} />,
    );

    expect(getByText('+5.01 mUSD')).toBeOnTheScreen();
    expect(getByText('Confirmed')).toBeOnTheScreen();
    expect(getByText('...233944')).toBeOnTheScreen();
    expect(getByText('Transaction fee')).toBeOnTheScreen();
    expect(getByText('Total amount')).toBeOnTheScreen();
    expect(getByText('$1.26')).toBeOnTheScreen();
    expect(getByText('$6.27')).toBeOnTheScreen();
    expect(queryByText('Destination')).toBeNull();
    expect(queryByText('View on Mercuryo')).toBeNull();
  });

  it('shows provider link and copies the full FiatOrder id', async () => {
    const item = makeItem({
      ...baseOrder,
      data: { providerOrderLink: 'https://mercuryo.io/order/abc' },
    });

    const { getByText, getByTestId } = render(<RampDetails item={item} />);

    expect(getByText('View on Mercuryo')).toBeOnTheScreen();
    fireEvent.press(getByTestId('ramp-provider-order-link'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: 'https://mercuryo.io/order/abc' },
    });

    fireEvent.press(getByTestId('ramp-order-id-copy'));
    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith('0d13232233944');
    });
  });

  it('renders sell-specific destination and received total rows', () => {
    const item = makeItem({
      ...baseOrder,
      orderType: OrderOrderTypeEnum.Sell,
      cryptocurrency: 'ETH',
      cryptoAmount: '0.085',
      currency: 'EUR',
      amount: '61.88',
      fee: '3',
      txHash: undefined,
      sellTxHash: '0xsellhash',
    });

    const { getByText } = render(<RampDetails item={item} />);

    expect(getByText('-0.085 ETH')).toBeOnTheScreen();
    expect(getByText('Destination')).toBeOnTheScreen();
    expect(getByText('Mercuryo')).toBeOnTheScreen();
    expect(getByText('EUR value')).toBeOnTheScreen();
    expect(getByText('Fees')).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('€61.88')).toBeOnTheScreen();
    expect(getByText('€3')).toBeOnTheScreen();
    expect(getByText('€58.88')).toBeOnTheScreen();
  });

  it('opens the block explorer when the footer button is pressed', () => {
    const { getByText } = render(<RampDetails item={makeItem(baseOrder)} />);

    fireEvent.press(getByText('View on block explorer'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: 'https://etherscan.io/tx/0xhash', title: 'etherscan.io' },
    });
  });

  it('renders native RampsOrder details via RampRampsOrderDetails', async () => {
    const { mapRampsOrder } = jest.requireActual(
      '../../../../util/activity-adapters',
    );
    const { RampsOrderStatus } = jest.requireActual(
      '@metamask/ramps-controller',
    );
    const order = {
      isOnlyLink: false,
      success: true,
      cryptoAmount: '5.01',
      fiatAmount: 6.27,
      providerOrderId: 'po-1',
      providerOrderLink: 'https://example.com',
      createdAt: Date.UTC(2025, 11, 10, 10, 34),
      totalFeesFiat: 1.26,
      txHash: '0x232123456789abcdef123456789abcdef12321',
      walletAddress: '0x232123456789abcdef123456789abcdef12321',
      status: RampsOrderStatus.Completed,
      network: { name: 'Ethereum', chainId: 'eip155:1' },
      canBeUpdated: false,
      idHasExpired: false,
      excludeFromPurchases: false,
      timeDescriptionPending: '',
      orderType: 'BUY',
      id: '/providers/transak/orders/po-1',
      cryptoCurrency: { symbol: 'mUSD', decimals: 6 },
      fiatCurrency: { symbol: 'USD', decimals: 2 },
      provider: { name: 'Transak' },
    };
    const item = mapRampsOrder({ order }) as RampActivityListItem;

    const { getByText, getByTestId } = render(<RampDetails item={item} />);

    expect(getByText('+5.01 mUSD')).toBeOnTheScreen();
    expect(getByText('po-1')).toBeOnTheScreen();
    expect(getByText('View on Transak')).toBeOnTheScreen();
    expect(getByText('$1.26')).toBeOnTheScreen();
    expect(getByText('$6.27')).toBeOnTheScreen();

    fireEvent.press(getByTestId('ramp-provider-order-link'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: 'https://example.com' },
    });

    fireEvent.press(getByTestId('ramp-order-id-copy'));
    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith('po-1');
    });
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import Routes from '../../../../../constants/navigation/Routes';
import {
  getOrderById,
  getProviderName,
} from '../../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../util/networks';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useAccountNames } from '../../../../hooks/DisplayName/useAccountNames';
import RampActivityDetails from './RampActivityDetails';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getOrderById: jest.fn(),
  getProviderName: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../../../hooks/DisplayName/useAccountNames', () => ({
  useAccountNames: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  findBlockExplorerUrlForChain: jest.fn(),
  getBlockExplorerTxUrl: jest.fn(),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      wrapper: {},
      container: {},
    },
  }),
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

function arrange(order: FiatOrder) {
  (useNavigation as jest.Mock).mockReturnValue({
    navigate: mockNavigate,
    goBack: mockGoBack,
  });
  (useParams as jest.Mock).mockReturnValue({ orderId: order.id });
  (useSelector as unknown as jest.Mock).mockImplementation((selector) =>
    selector({ settings: {} }),
  );
  (getOrderById as jest.Mock).mockReturnValue(order);
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

describe('RampActivityDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a buy/deposit style details view', () => {
    arrange(baseOrder);

    const { getByText, queryByText } = render(<RampActivityDetails />);

    expect(getByText('Bought mUSD')).toBeOnTheScreen();
    expect(getByText('+5.01 mUSD')).toBeOnTheScreen();
    expect(getByText('Confirmed')).toBeOnTheScreen();
    expect(getByText('0d13232233944')).toBeOnTheScreen();
    expect(getByText('Transaction fee')).toBeOnTheScreen();
    expect(getByText('Total amount')).toBeOnTheScreen();
    expect(getByText('$1.26')).toBeOnTheScreen();
    expect(getByText('$6.27')).toBeOnTheScreen();
    expect(queryByText('Destination')).toBeNull();
  });

  it('renders sell-specific destination and received total rows', () => {
    arrange({
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

    const { getByText } = render(<RampActivityDetails />);

    expect(getByText('Sold ETH')).toBeOnTheScreen();
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
    arrange(baseOrder);

    const { getByText } = render(<RampActivityDetails />);
    fireEvent.press(getByText('View on block explorer'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: 'https://etherscan.io/tx/0xhash', title: 'etherscan.io' },
    });
  });
});

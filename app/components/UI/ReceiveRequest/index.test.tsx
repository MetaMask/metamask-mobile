import React from 'react';
import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';
import ReceiveRequest from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';
import { RequestPaymentModalSelectorsIDs } from './RequestPaymentModal.testIds';
import { fireEvent } from '@testing-library/react-native';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum',
          ticker: 'ETH',
          chainId: '0x1',
          type: RpcEndpointType.Infura,
        }),
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '1',
        nativeTokenSupported: true,
      },
    ],
  },
};

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  renderAccountName: jest.fn(),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

// Mock QRCode component to test props
jest.mock('react-native-qrcode-svg', () => {
  const actualReact = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockQRCode({
    value,
    size,
    logoSize,
    logoBorderRadius,
  }: {
    value: string;
    size?: number;
    logoSize?: number;
    logoBorderRadius?: number;
  }) {
    return actualReact.createElement(
      Text,
      {
        testID: 'receive-request-qr-code',
        accessibilityLabel: `QR Code: ${value}, size: ${size}, logoSize: ${logoSize}, logoBorderRadius: ${logoBorderRadius}`,
      },
      `QR: ${value}`,
    );
  };
});

// Mock QRAccountDisplay to test integration
jest.mock('../../Views/QRAccountDisplay', () => {
  const actualReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockQRAccountDisplay({
    accountAddress,
  }: {
    accountAddress: string;
  }) {
    return actualReact.createElement(
      View,
      { testID: 'receive-request-qr-account-display' },
      actualReact.createElement(
        Text,
        { testID: 'qr-account-address' },
        accountAddress,
      ),
    );
  };
});

describe('ReceiveRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders QR code with correct properties', () => {
    // Arrange & Act
    const { getByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    const qrCode = getByTestId('receive-request-qr-code');

    // Assert
    expect(qrCode).toBeOnTheScreen();
    expect(qrCode.props.accessibilityLabel).toContain('size: 200');
    expect(qrCode.props.accessibilityLabel).toContain('logoSize: 32');
    expect(qrCode.props.accessibilityLabel).toContain('logoBorderRadius: 8');
  });

  it('displays account address in QR account display', () => {
    // Arrange & Act
    const { getByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );

    // Assert
    expect(getByTestId('receive-request-qr-account-display')).toBeOnTheScreen();
    expect(getByTestId('qr-account-address')).toBeOnTheScreen();
  });

  it('render with different ticker matches snapshot', () => {
    const state = cloneDeep(initialState);
    state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
      '0x1'
    ].nativeCurrency = 'DIFF';
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render without buy matches snapshot', () => {
    const state = {
      ...initialState,
      fiatOrders: undefined,
    };
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders request payment button when EVM network is selected', () => {
    // Arrange & Act
    const { getByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    const requestButton = getByTestId(
      RequestPaymentModalSelectorsIDs.REQUEST_BUTTON,
    );

    // Assert
    expect(requestButton).toBeOnTheScreen();
  });

  it('does not render request button when EVM network is not selected', () => {
    // Arrange
    const state = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          MultichainNetworkController: {
            isEvmSelected: false,
          },
        },
      },
    };

    // Act
    const { queryByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );

    // Assert
    expect(
      queryByTestId(RequestPaymentModalSelectorsIDs.REQUEST_BUTTON),
    ).toBeNull();
  });

  it('navigates to payment request when request button is pressed', () => {
    // Arrange
    const mockNavigate = jest.fn();
    const receiveAsset = { symbol: 'ETH' };

    // Act
    const { getByTestId } = renderScreen(
      () =>
        React.createElement(ReceiveRequest, {
          navigation: { navigate: mockNavigate },
          selectedAddress: '0x123',
          receiveAsset,
          metrics: {
            trackEvent: jest.fn(),
            createEventBuilder: jest.fn(() => ({ build: jest.fn() })),
          },
        }),
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    const requestButton = getByTestId(
      RequestPaymentModalSelectorsIDs.REQUEST_BUTTON,
    );
    fireEvent.press(requestButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      'PaymentRequestView',
      expect.objectContaining({
        screen: 'PaymentRequest',
        params: expect.any(Object),
      }),
    );
  });
});

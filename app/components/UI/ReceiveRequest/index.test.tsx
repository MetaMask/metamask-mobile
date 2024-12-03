import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';
import { fireEvent } from '@testing-library/react-native';
import { StackNavigationOptions } from '@react-navigation/stack';
import ReceiveRequest from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';

interface ScreenParams {
  name: string;
  options?: StackNavigationOptions;
  metrics?: {
    trackEvent: jest.Mock;
    createEventBuilder: jest.Mock;
  };
}

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

describe('ReceiveRequest', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks metrics when onReceive is called', () => {
    const mockTrackEvent = jest.fn();
    const mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn(),
      }),
      build: jest.fn(),
    });

    const { getByTestId } = renderScreen(
      ReceiveRequest,
      {
        name: 'ReceiveRequest',
        metrics: {
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        },
      } as ScreenParams,
      { state: initialState },
    );

    const requestButton = getByTestId('request-payment-button');
    fireEvent.press(requestButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith('ReceiveRequest');
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      'RECEIVE_OPTIONS_PAYMENT_REQUEST',
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
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
});

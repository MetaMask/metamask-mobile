import { cloneDeep } from 'lodash';
import ReceiveRequest from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import Share from 'react-native-share';
import ClipboardManager from '../../../core/ClipboardManager';
import { MetaMetricsEvents } from '../../../core/Analytics';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
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
  it('render correctly', () => {
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render correctly with different ticker', () => {
    const state = cloneDeep(initialState);
    state.engine.backgroundState.NetworkController.providerConfig.ticker =
      'DIFF';
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render correctly without buy', () => {
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

  it('share the address and track event onShare', async () => {
    const state = cloneDeep(initialState);
    const { findByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );

    await findByTestId('share-button').props.onPress();
    expect(Share.open).toHaveBeenCalledWith({
      message: expect.stringContaining('ethereum:'),
    });
    expect(state.metrics.trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.RECEIVE_OPTIONS_SHARE_ADDRESS,
    );
  });

  it('copy the address to clipboard and show alert', async () => {
    const state = cloneDeep(initialState);
    const { findByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );

    await findByTestId('copy-button').props.onPress();
    expect(ClipboardManager.setString).toHaveBeenCalledWith(
      state.selectedAddress,
    );
    expect(state.showAlert).toHaveBeenCalledWith({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: 'Account address copied to clipboard' },
    });
  });

  it('open and close QR modal', async () => {
    const state = cloneDeep(initialState);
    const { findByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );

    await findByTestId('qr-button').props.onPress();
    expect(state.qrModalVisible).toBe(true);

    await findByTestId('close-qr-button').props.onPress();
    expect(state.qrModalVisible).toBe(false);
  });

  it('navigate to PaymentRequestView and track event onReceive', async () => {
    const state = cloneDeep(initialState);
    const { findByTestId } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state },
    );

    await findByTestId('receive-button').props.onPress();
    expect(state.navigation.navigate).toHaveBeenCalledWith(
      'PaymentRequestView',
      {
        screen: 'PaymentRequest',
        params: { receiveAsset: state.receiveAsset },
      },
    );
    expect(state.metrics.trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST,
    );
  });
});

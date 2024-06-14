import ReceiveRequest from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { cloneDeep } from 'lodash';

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        identities: {
          address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          name: 'Account 1',
        },
      },
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          chainId: '0x1',
          ticker: 'ETH',
        },
      },
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

describe('ReceiveRequest', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with different ticker', () => {
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

  it('should render correctly without buy', () => {
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

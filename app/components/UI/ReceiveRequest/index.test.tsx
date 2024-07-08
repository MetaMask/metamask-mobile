import ReceiveRequest from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

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

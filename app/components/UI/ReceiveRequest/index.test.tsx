import { cloneDeep } from 'lodash';
import ReceiveRequest from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          chainId: '0x1',
          ticker: 'ETH',
        },
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
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render with different ticker matches snapshot', () => {
    const state = cloneDeep(initialState);
    state.engine.backgroundState.NetworkController.providerConfig.ticker =
      'DIFF';
    const { toJSON } = renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      // @ts-expect-error initialBackgroundState throws error
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
      // @ts-expect-error initialBackgroundState throws error
      { state },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

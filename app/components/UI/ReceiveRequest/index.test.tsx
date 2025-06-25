import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';
import ReceiveRequest from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';
import { endTrace, TraceName } from '../../../util/trace';

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

jest.mock('../../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: {
    ReceiveModal: 'Receive Modal',
  },
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

  it('should call endTrace on componentDidMount', () => {
    renderScreen(
      ReceiveRequest,
      { name: 'ReceiveRequest' },
      { state: initialState },
    );
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.ReceiveModal,
    });
  });
});

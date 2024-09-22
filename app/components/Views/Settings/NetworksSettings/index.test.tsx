import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { RpcEndpointType } from '@metamask/network-controller';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Sepolia',
          ticker: 'SepoliaETH',
          type: RpcEndpointType.Infura,
        }),
      },
    },
  },
};

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      NetworksSettings,
      { name: 'Network Settings' },
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

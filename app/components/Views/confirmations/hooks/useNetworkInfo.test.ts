import { CHAIN_IDS } from '@metamask/transaction-controller';

import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { RootState } from '../../../../reducers';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../../util/test/network';
import useNetworkInfo from './useNetworkInfo';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
        }),
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: DeepPartial<RootState>) => unknown) =>
    fn(mockInitialState),
}));

describe('useNetworkInfo', () => {
  it('should return existing address from accounts controller', async () => {
    const { result } = renderHookWithProvider(
      () => useNetworkInfo(CHAIN_IDS.MAINNET),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current?.networkName).toEqual('Ethereum Mainnet');
    expect(result?.current?.networkImage).toEqual(1);
  });
});

import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import { backgroundState } from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { useGetChainIdsToDetectNfts } from './useGetChainIdsToDetectNfts';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectAllPopularNetworkConfigurations,
} from '../../selectors/networkController';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useGetChainIdsToDetectNfts', () => {
  it('should return current chain id when isAllNetworks is false', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsAllNetworks) {
        return false; // to show all networks
      }
      if (selector === selectChainId) {
        return '0x1';
      }
      return null;
    });
    const { result } = renderHookWithProvider(
      () => useGetChainIdsToDetectNfts(),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current).toEqual(['0x1']);
  });
  it('should return array of all popular networks when isAllNetworks is true', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsAllNetworks) {
        return true;
      }
      if (selector === selectIsPopularNetwork) {
        return true;
      }
      if (selector === selectAllPopularNetworkConfigurations) {
        return {
          '0x1': {
            chainId: '0x1',
          },
          '0x2': {
            chainId: '0x2',
          },
        };
      }
      return null;
    });
    const { result } = renderHookWithProvider(
      () => useGetChainIdsToDetectNfts(),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current).toEqual(['0x1', '0x2']);
  });
});

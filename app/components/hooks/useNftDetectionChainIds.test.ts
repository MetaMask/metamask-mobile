import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import { backgroundState } from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { useNftDetectionChainIds } from './useNftDetectionChainIds';
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

describe('useNftDetectionChainIds', () => {
  it('returns current chain id when filtered on current network', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsAllNetworks) {
        return false; // to show all networks
      }
      if (selector === selectChainId) {
        return '0x1';
      }
      return null;
    });
    const { result } = renderHookWithProvider(() => useNftDetectionChainIds(), {
      state: mockInitialState,
    });
    expect(result?.current).toEqual(['0x1']);
  });
  it('returns array of all popular networks when there is no filter on networks', async () => {
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
    const { result } = renderHookWithProvider(() => useNftDetectionChainIds(), {
      state: mockInitialState,
    });
    expect(result?.current).toEqual(['0x1', '0x2']);
  });
});

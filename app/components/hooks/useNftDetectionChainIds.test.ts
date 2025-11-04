import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import { backgroundState } from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { useNftDetectionChainIds } from './useNftDetectionChainIds';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../selectors/networkController';
import { useCurrentNetworkInfo } from './useCurrentNetworkInfo';

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

jest.mock('./useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
}));

describe('useNftDetectionChainIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns current chain id when enabledNetworks is empty', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) {
        return '0x1';
      }
      return null;
    });

    (useCurrentNetworkInfo as jest.Mock).mockReturnValue({
      enabledNetworks: [], // Empty array should fallback to current chainId
    });

    const { result } = renderHookWithProvider(() => useNftDetectionChainIds(), {
      state: mockInitialState,
    });
    expect(result?.current).toEqual(['0x1']);
  });

  it('returns array of enabled network chain ids when enabledNetworks has networks', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) {
        return '0x1';
      }
      return null;
    });

    (useCurrentNetworkInfo as jest.Mock).mockReturnValue({
      enabledNetworks: [
        { chainId: '0x1', enabled: true },
        { chainId: '0x89', enabled: true },
        { chainId: '0xa', enabled: true },
      ],
    });

    const { result } = renderHookWithProvider(() => useNftDetectionChainIds(), {
      state: mockInitialState,
    });
    expect(result?.current).toEqual(['0x1', '0x89', '0xa']);
  });
});

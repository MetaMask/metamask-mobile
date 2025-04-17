import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useInitialDestToken } from '.';
import { waitFor } from '@testing-library/react-native';
import { initialState } from '../../_mocks_/initialState';
import { BridgeViewMode } from '../../types';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { SolScope } from '@metamask/keyring-api';
import { selectChainId } from '../../../../../selectors/networkController';
import { useRoute } from '@react-navigation/native';
import { setDestToken } from '../../../../../core/redux/slices/bridge';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    ...actual,
    setDestToken: jest.fn(actual.setDestToken),
  };
});

jest.mock('../../../../../selectors/networkController', () => {
  const actual = jest.requireActual('../../../../../selectors/networkController');
  return {
    ...actual,
    selectChainId: jest.fn(actual.selectChainId),
  };
});

describe('useInitialDestToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not set dest token when not in swap mode', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        bridgeViewMode: BridgeViewMode.Bridge,
      },
    });

    renderHookWithProvider(() => useInitialDestToken(), {
      state: initialState,
    });

    // Verify setDestToken was not called
    expect(setDestToken).not.toHaveBeenCalled();
  });

  it('should set default dest token when in swap mode and default token exists', async () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        bridgeViewMode: BridgeViewMode.Swap,
      },
    });
    (selectChainId as unknown as jest.Mock).mockReturnValue(SolScope.Mainnet);

    renderHookWithProvider(() => useInitialDestToken(), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setDestToken).toHaveBeenCalledWith(DefaultSwapDestTokens[SolScope.Mainnet]);
    });
  });

  it('should not set dest token when in swap mode but no default token exists', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        bridgeViewMode: BridgeViewMode.Swap,
      },
    });
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1234567890');

    renderHookWithProvider(() => useInitialDestToken(), {
      state: initialState,
    });

    // Verify setDestToken was not called
    expect(setDestToken).not.toHaveBeenCalled();
  });
});

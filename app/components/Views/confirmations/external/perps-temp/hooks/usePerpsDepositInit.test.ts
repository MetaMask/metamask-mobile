import { Token } from '@metamask/assets-controllers';
import Engine from '../../../../../../core/Engine';
import { selectTokensByChainIdAndAddress } from '../../../../../../selectors/tokensController';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import {
  ARBITRUM_USDC_ADDRESS,
  usePerpsDepositInit,
} from './usePerpsDepositInit';
import { act } from '@testing-library/react-native';

const NETWORK_CLIENT_ID = 'mockNetworkClientId';

jest.mock('../../../../../../selectors/tokensController');

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TokensController: {
      addToken: jest.fn(),
    },
  },
}));

async function runHook() {
  const result = renderHookWithProvider(usePerpsDepositInit, {});

  await act(async () => {
    // Intentionally empty
  });

  return result;
}

describe('usePerpsDepositInit', () => {
  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );
  const mockAddToken = jest.mocked(Engine.context.TokensController.addToken);
  const selectTokensByChainIdAndAddressMock = jest.mocked(
    selectTokensByChainIdAndAddress,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindNetworkClientIdByChainId.mockReturnValue(NETWORK_CLIENT_ID);
    mockAddToken.mockResolvedValue([]);
    selectTokensByChainIdAndAddressMock.mockReturnValue({});
  });

  it('adds token if not present', async () => {
    await runHook();

    expect(mockAddToken).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ARBITRUM_USDC_ADDRESS,
        networkClientId: NETWORK_CLIENT_ID,
      }),
    );
  });

  it('does not add token if already present', async () => {
    selectTokensByChainIdAndAddressMock.mockReturnValue({
      [ARBITRUM_USDC_ADDRESS]: {
        address: ARBITRUM_USDC_ADDRESS,
      } as Token,
    });

    await runHook();

    expect(mockAddToken).not.toHaveBeenCalled();
  });
});

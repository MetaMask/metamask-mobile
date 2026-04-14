import { renderHook, act } from '@testing-library/react-hooks';
import { RpcEndpointType } from '@metamask/network-controller';
import { useSelector } from 'react-redux';
import { useEnsureCardNetworkExists } from './useEnsureCardNetworkExists';
import Engine from '../../../../core/Engine';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';

jest.mock('../../../../core/Engine');
jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockEnableNetwork = jest.fn();
const mockAddNetwork = jest.fn();
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

interface MockEngineContext {
  NetworkController: {
    addNetwork: jest.Mock;
  };
}

const MONAD_CAIP_CHAIN_ID = 'eip155:143';
const MONAD_HEX_CHAIN_ID = '0x8f';
const UNKNOWN_CAIP_CHAIN_ID = 'eip155:99999';

describe('useEnsureCardNetworkExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useNetworkEnablement as jest.Mock).mockReturnValue({
      enableNetwork: mockEnableNetwork,
    });

    (Engine.context as unknown as MockEngineContext) = {
      NetworkController: {
        addNetwork: mockAddNetwork,
      },
    };

    // Default: no networks configured
    mockUseSelector.mockReturnValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns ensureNetworkExists function', () => {
    const { result } = renderHook(() => useEnsureCardNetworkExists());

    expect(result.current).toEqual({
      ensureNetworkExists: expect.any(Function),
    });
  });

  describe('ensureNetworkExists', () => {
    describe('when network already exists in user configurations', () => {
      const existingNetworkClientId = 'monad-mainnet';

      beforeEach(() => {
        mockUseSelector.mockReturnValue({
          [MONAD_HEX_CHAIN_ID]: {
            chainId: MONAD_HEX_CHAIN_ID,
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: existingNetworkClientId }],
          },
        });
      });

      it('returns the existing networkClientId', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        let networkClientId: string | undefined;
        await act(async () => {
          networkClientId =
            await result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID);
        });

        expect(networkClientId).toBe(existingNetworkClientId);
      });

      it('does not call addNetwork', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID);
        });

        expect(mockAddNetwork).not.toHaveBeenCalled();
      });

      it('does not call enableNetwork', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID);
        });

        expect(mockEnableNetwork).not.toHaveBeenCalled();
      });
    });

    describe('when network is missing', () => {
      const newNetworkClientId = 'monad-mainnet-new';

      beforeEach(() => {
        mockAddNetwork.mockResolvedValue({
          chainId: MONAD_HEX_CHAIN_ID,
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [{ networkClientId: newNetworkClientId }],
        });
      });

      it('calls addNetwork with Monad config from PopularList', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID);
        });

        expect(mockAddNetwork).toHaveBeenCalledWith({
          chainId: MONAD_HEX_CHAIN_ID,
          blockExplorerUrls: ['https://monadscan.com/'],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: 'Monad',
          nativeCurrency: 'MON',
          rpcEndpoints: [
            {
              url: expect.stringContaining(
                'https://monad-mainnet.infura.io/v3/',
              ),
              failoverUrls: expect.any(Array),
              name: 'Monad',
              type: RpcEndpointType.Custom,
            },
          ],
        });
      });

      it('enables the network after adding it', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID);
        });

        expect(mockEnableNetwork).toHaveBeenCalledWith(MONAD_CAIP_CHAIN_ID);
        expect(mockEnableNetwork).toHaveBeenCalledTimes(1);
      });

      it('returns the new networkClientId', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        let networkClientId: string | undefined;
        await act(async () => {
          networkClientId =
            await result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID);
        });

        expect(networkClientId).toBe(newNetworkClientId);
      });

      it('throws when addNetwork returns no networkClientId', async () => {
        mockAddNetwork.mockResolvedValue({
          chainId: MONAD_HEX_CHAIN_ID,
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [{}],
        });

        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await expect(
            result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID),
          ).rejects.toThrow(
            `Failed to get networkClientId after adding network for ${MONAD_CAIP_CHAIN_ID}`,
          );
        });
      });

      it('propagates addNetwork errors', async () => {
        const networkError = new Error('Network addition failed');
        mockAddNetwork.mockRejectedValue(networkError);

        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await expect(
            result.current.ensureNetworkExists(MONAD_CAIP_CHAIN_ID),
          ).rejects.toThrow('Network addition failed');
        });
      });
    });

    describe('when chain ID is not in PopularList', () => {
      it('throws a descriptive error', async () => {
        const { result } = renderHook(() => useEnsureCardNetworkExists());

        await act(async () => {
          await expect(
            result.current.ensureNetworkExists(UNKNOWN_CAIP_CHAIN_ID),
          ).rejects.toThrow(
            `Network not found in PopularList for chain ID ${UNKNOWN_CAIP_CHAIN_ID}`,
          );
        });

        expect(mockAddNetwork).not.toHaveBeenCalled();
      });
    });
  });
});

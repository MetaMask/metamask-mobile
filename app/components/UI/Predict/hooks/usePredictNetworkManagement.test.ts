import { renderHook, act } from '@testing-library/react-hooks';
import { toHex } from '@metamask/controller-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { useSelector } from 'react-redux';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import {
  POLYGON_MAINNET_CHAIN_ID,
  POLYGON_MAINNET_CAIP_CHAIN_ID,
} from '../providers/polymarket/constants';

// Mock all external dependencies
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));
jest.mock('../../../../core/Engine');
jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockEnableNetwork = jest.fn();
const mockAddNetwork = jest.fn();
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

interface MockEngineContext {
  NetworkController: {
    addNetwork: jest.Mock;
  };
}

describe('usePredictNetworkManagement', () => {
  const polygonChainId = toHex(POLYGON_MAINNET_CHAIN_ID);

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

    mockUseSelector.mockReturnValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ensurePolygonNetworkExists', () => {
    it('returns early when Polygon network already exists', async () => {
      mockUseSelector.mockReturnValue({
        [polygonChainId]: { chainId: polygonChainId, name: 'Polygon' },
      });

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await result.current.ensurePolygonNetworkExists();
      });

      expect(mockAddNetwork).not.toHaveBeenCalled();
      expect(mockEnableNetwork).not.toHaveBeenCalled();
    });

    it('adds Polygon network when network does not exist', async () => {
      mockAddNetwork.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await result.current.ensurePolygonNetworkExists();
      });

      expect(mockAddNetwork).toHaveBeenCalledWith({
        chainId: polygonChainId,
        blockExplorerUrls: ['https://polygonscan.com'],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: 'Polygon',
        nativeCurrency: 'POL',
        rpcEndpoints: [
          {
            url: expect.stringContaining(
              'https://polygon-mainnet.infura.io/v3/',
            ),
            name: 'Polygon',
            type: RpcEndpointType.Custom,
          },
        ],
      });
    });

    it('enables Polygon network after adding network', async () => {
      mockAddNetwork.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await result.current.ensurePolygonNetworkExists();
      });

      expect(mockEnableNetwork).toHaveBeenCalledWith(
        POLYGON_MAINNET_CAIP_CHAIN_ID,
      );
      expect(mockEnableNetwork).toHaveBeenCalledTimes(1);
    });

    it('uses correct chain ID hex value', async () => {
      mockAddNetwork.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await result.current.ensurePolygonNetworkExists();
      });

      expect(mockAddNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: '0x89',
        }),
      );
    });

    it('logs error to Sentry when network addition fails', async () => {
      const networkError = new Error('Network addition failed');
      mockAddNetwork.mockRejectedValue(networkError);

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await expect(
          result.current.ensurePolygonNetworkExists(),
        ).rejects.toThrow('Network addition failed');
      });

      expect(mockLoggerError).toHaveBeenCalledWith(networkError, {
        tags: {
          component: 'usePredictNetworkManagement',
          feature: 'Predict',
        },
        context: {
          name: 'usePredictNetworkManagement',
          data: {
            action: 'add_polygon_network',
            method: 'ensurePolygonMainnet',
            operation: 'network_management',
            chainId: polygonChainId,
            caipChainId: POLYGON_MAINNET_CAIP_CHAIN_ID,
          },
        },
      });
    });

    it('attempts to enable network even when addition fails', async () => {
      mockAddNetwork.mockRejectedValue(new Error('Network addition failed'));

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await expect(
          result.current.ensurePolygonNetworkExists(),
        ).rejects.toThrow('Network addition failed');
      });

      expect(mockEnableNetwork).toHaveBeenCalledWith(
        POLYGON_MAINNET_CAIP_CHAIN_ID,
      );
    });

    it('handles non-Error exceptions when logging to Sentry', async () => {
      const errorMessage = 'String error message';
      mockAddNetwork.mockRejectedValue(errorMessage);

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await expect(result.current.ensurePolygonNetworkExists()).rejects.toBe(
          errorMessage,
        );
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('String error message'),
        expect.any(Object),
      );
    });

    it('uses Infura project ID in RPC endpoint URL', async () => {
      mockAddNetwork.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePredictNetworkManagement());

      await act(async () => {
        await result.current.ensurePolygonNetworkExists();
      });

      expect(mockAddNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcEndpoints: [
            expect.objectContaining({
              url: expect.stringContaining(
                'https://polygon-mainnet.infura.io/v3/',
              ),
            }),
          ],
        }),
      );
    });
  });

  it('returns ensurePolygonNetworkExists function', () => {
    const { result } = renderHook(() => usePredictNetworkManagement());

    expect(result.current).toEqual({
      ensurePolygonNetworkExists: expect.any(Function),
    });
  });
});

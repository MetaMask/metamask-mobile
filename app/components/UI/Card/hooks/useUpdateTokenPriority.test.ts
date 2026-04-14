import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useUpdateTokenPriority } from './useUpdateTokenPriority';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { AllowanceState, type CardTokenAllowance } from '../types';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      updateAssetPriority: jest.fn(),
    },
  },
}));
jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUpdateAssetPriority = Engine.context.CardController
  .updateAssetPriority as jest.Mock;

const assetA: CardFundingAsset = {
  address: '0xusdctoken',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  walletAddress: '0xwallet1',
  chainId: 'eip155:59144' as `eip155:${number}`,
  balance: '100',
  allowance: '100',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const assetB: CardFundingAsset = {
  address: '0xusdttoken',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  walletAddress: '0xwallet2',
  chainId: 'eip155:59144' as `eip155:${number}`,
  balance: '50',
  allowance: '50',
  priority: 2,
  status: FundingAssetStatus.Active,
};

const mockCardHomeData = {
  primaryAsset: assetA,
  assets: [assetA, assetB],
  supportedTokens: [],
  card: null,
  account: null,
  alerts: [],
  actions: [],
};

const tokenA: CardTokenAllowance = {
  address: '0xusdctoken',
  caipChainId: 'eip155:59144',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  allowanceState: AllowanceState.Enabled,
  allowance: '100',
  availableBalance: '100',
  walletAddress: '0xwallet1',
  priority: 1,
};

describe('useUpdateTokenPriority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockCardHomeData);
    mockUpdateAssetPriority.mockResolvedValue(undefined);
  });

  describe('updateTokenPriority', () => {
    it('calls CardController.updateAssetPriority with matched asset and all assets', async () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() =>
        useUpdateTokenPriority({ onSuccess: mockOnSuccess }),
      );

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(tokenA);
      });

      expect(updateResult).toBe(true);
      expect(mockUpdateAssetPriority).toHaveBeenCalledWith(assetA, [
        assetA,
        assetB,
      ]);
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('returns true and calls onSuccess when update succeeds', async () => {
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(tokenA);
      });

      expect(updateResult).toBe(true);
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('returns false and calls onError when no matching asset is found', async () => {
      const mockOnError = jest.fn();
      const { result } = renderHook(() =>
        useUpdateTokenPriority({ onError: mockOnError }),
      );

      const unknownToken: CardTokenAllowance = {
        ...tokenA,
        address: '0xunknown',
        walletAddress: '0xunknown',
        symbol: 'UNKNOWN',
      };

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(unknownToken);
      });

      expect(updateResult).toBe(false);
      expect(mockUpdateAssetPriority).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('returns false and calls onError when cardHomeData is null', async () => {
      mockUseSelector.mockReturnValue(null);
      const mockOnError = jest.fn();
      const { result } = renderHook(() =>
        useUpdateTokenPriority({ onError: mockOnError }),
      );

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(tokenA);
      });

      expect(updateResult).toBe(false);
      expect(mockUpdateAssetPriority).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('returns false and calls onError when CardController.updateAssetPriority throws', async () => {
      const sdkError = new Error('update failed');
      mockUpdateAssetPriority.mockRejectedValue(sdkError);
      const mockOnError = jest.fn();
      const { result } = renderHook(() =>
        useUpdateTokenPriority({ onError: mockOnError }),
      );

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(tokenA);
      });

      expect(updateResult).toBe(false);
      expect(mockOnError).toHaveBeenCalledWith(sdkError);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('matches assets case-insensitively by symbol', async () => {
      const uppercaseToken: CardTokenAllowance = {
        ...tokenA,
        symbol: 'usdc', // lowercase — assetA has 'USDC'
      };
      const { result } = renderHook(() => useUpdateTokenPriority());

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(uppercaseToken);
      });

      expect(updateResult).toBe(true);
      expect(mockUpdateAssetPriority).toHaveBeenCalledWith(assetA, [
        assetA,
        assetB,
      ]);
    });

    it('matches assets case-insensitively by walletAddress', async () => {
      const uppercaseToken: CardTokenAllowance = {
        ...tokenA,
        walletAddress: '0xWALLET1', // uppercase — assetA has '0xwallet1'
      };
      const { result } = renderHook(() => useUpdateTokenPriority());

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(uppercaseToken);
      });

      expect(updateResult).toBe(true);
    });
  });
});

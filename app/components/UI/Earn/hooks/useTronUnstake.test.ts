import { act, renderHook } from '@testing-library/react-hooks';
import { TrxScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import useTronUnstake from './useTronUnstake';
import {
  confirmTronUnstake,
  validateTronUnstakeAmount,
  computeStakeFee,
  TronUnstakeResult,
} from '../utils/tron-staking-snap';
import { TokenI } from '../../Tokens/types';

const mockSelectSelectedInternalAccountByScope = jest.fn();
const mockSelectTrxStakingEnabled = jest.fn();
const mockSelectTronResourcesBySelectedAccountGroup = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () =>
    mockSelectSelectedInternalAccountByScope,
}));

jest.mock(
  '../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: () => mockSelectTrxStakingEnabled(),
  }),
);

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectTronResourcesBySelectedAccountGroup: () =>
    mockSelectTronResourcesBySelectedAccountGroup(),
}));

jest.mock('../utils/tron-staking-snap', () => ({
  confirmTronUnstake: jest.fn(),
  validateTronUnstakeAmount: jest.fn(),
  computeStakeFee: jest.fn(),
}));

jest.mock('../../../../core/Multichain/utils', () => ({
  isTronChainId: jest.fn((chainId: string) => chainId.startsWith('tron:')),
}));

jest.mock('../utils/tron', () => ({
  getStakedTrxTotalFromResources: jest.fn(() => 100),
  buildTronEarnTokenIfEligible: jest.fn(() => ({
    symbol: 'TRX',
    balance: '100',
    experience: { type: 'pooled-staking' },
  })),
}));

describe('useTronUnstake', () => {
  const mockValidateTronUnstakeAmount =
    validateTronUnstakeAmount as jest.MockedFunction<
      typeof validateTronUnstakeAmount
    >;
  const mockConfirmTronUnstake = confirmTronUnstake as jest.MockedFunction<
    typeof confirmTronUnstake
  >;
  const mockComputeStakeFee = computeStakeFee as jest.MockedFunction<
    typeof computeStakeFee
  >;

  const mockAccount: InternalAccount = {
    id: 'tron-account-id',
    address: 'tron-address',
    metadata: {
      snap: {
        id: 'npm:@metamask/tron-wallet-snap',
      },
    },
  } as InternalAccount;

  const mockTrxToken: TokenI = {
    address: '0x0',
    symbol: 'TRX',
    decimals: 6,
    isNative: true,
    chainId: TrxScope.Mainnet,
    balance: '100',
    balanceFiat: '$10',
  } as TokenI;

  const mockNonTrxToken: TokenI = {
    address: '0x123',
    symbol: 'ETH',
    decimals: 18,
    isNative: true,
    chainId: '0x1',
    balance: '1',
    balanceFiat: '$3000',
  } as TokenI;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock values
    mockSelectSelectedInternalAccountByScope.mockReturnValue(mockAccount);
    mockSelectTrxStakingEnabled.mockReturnValue(true);
    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue({
      energy: { staked: 50 },
      bandwidth: { staked: 50 },
    });
  });

  describe('initialization', () => {
    it('returns isTronAsset true for TRX token', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.isTronAsset).toBe(true);
    });

    it('returns isTronAsset false for non-TRX token', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockNonTrxToken }),
      );

      expect(result.current.isTronAsset).toBe(false);
    });

    it('returns isTronEnabled true when flag is on and token is TRX', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.isTronEnabled).toBe(true);
    });

    it('returns default resourceType as energy', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.resourceType).toBe('energy');
    });

    it('allows updating resourceType', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      act(() => {
        result.current.setResourceType('bandwidth');
      });

      expect(result.current.resourceType).toBe('bandwidth');
    });

    it('returns stakedTrxTotal when Tron is enabled', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.stakedTrxTotal).toBe(100);
    });

    it('returns tronWithdrawalToken when Tron is enabled', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.tronWithdrawalToken).toBeDefined();
      expect(result.current.tronWithdrawalToken?.symbol).toBe('TRX');
    });

    it('returns tronAccountId from selected account', () => {
      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.tronAccountId).toBe(mockAccount.id);
    });

    it('returns undefined tronAccountId when account is not selected', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      expect(result.current.tronAccountId).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('returns null when account is missing', async () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      let validation: TronUnstakeResult | null = null;
      await act(async () => {
        validation = await result.current.validateUnstakeAmount('10');
      });

      expect(validation).toBeNull();
      expect(mockValidateTronUnstakeAmount).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls validateTronUnstakeAmount with correct params including resourceType', async () => {
      const validationResult: TronUnstakeResult = {
        valid: true,
        errors: ['Warning message'],
      };
      mockValidateTronUnstakeAmount.mockResolvedValue(validationResult);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      // Set resourceType to bandwidth
      act(() => {
        result.current.setResourceType('bandwidth');
      });

      let validation: TronUnstakeResult | null = null;
      await act(async () => {
        validation = await result.current.validateUnstakeAmount('5');
      });

      expect(mockValidateTronUnstakeAmount).toHaveBeenCalledWith(mockAccount, {
        value: '5',
        accountId: mockAccount.id,
        assetId: `${TrxScope.Mainnet}/slip44:195`,
        options: { purpose: 'BANDWIDTH' },
      });

      expect(validation).toEqual(validationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toEqual(['Warning message']);
    });

    it('includes fee in preview when computeStakeFee returns fee', async () => {
      const validationResult: TronUnstakeResult = { valid: true };
      const mockFee = {
        type: 'fee',
        asset: {
          unit: 'TRX',
          type: 'TRX',
          amount: '0.5',
          fungible: true as const,
        },
      };
      mockValidateTronUnstakeAmount.mockResolvedValue(validationResult);
      mockComputeStakeFee.mockResolvedValue([mockFee]);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateUnstakeAmount('10');
      });

      expect(mockComputeStakeFee).toHaveBeenCalledWith(mockAccount, {
        fromAccountId: mockAccount.id,
        value: '10',
        options: { purpose: 'ENERGY' },
      });
      expect(result.current.preview).toEqual(
        expect.objectContaining({ fee: mockFee }),
      );
    });

    it('does not include fee in preview when computeStakeFee returns empty array', async () => {
      const validationResult: TronUnstakeResult & { extra: string } = {
        valid: true,
        extra: 'preview-data',
      };
      mockValidateTronUnstakeAmount.mockResolvedValue(validationResult);
      mockComputeStakeFee.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateUnstakeAmount('10');
      });

      expect(result.current.preview).toEqual({
        valid: true,
        extra: 'preview-data',
      });
      expect(result.current.preview).not.toHaveProperty('fee');
    });

    it('does not include fee in preview when computeStakeFee throws', async () => {
      const validationResult: TronUnstakeResult & { extra: string } = {
        valid: true,
        extra: 'preview-data',
      };
      mockValidateTronUnstakeAmount.mockResolvedValue(validationResult);
      mockComputeStakeFee.mockRejectedValue(
        new Error('Fee computation failed'),
      );

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateUnstakeAmount('10');
      });

      expect(result.current.preview).toEqual({
        valid: true,
        extra: 'preview-data',
      });
      expect(result.current.preview).not.toHaveProperty('fee');
    });
  });

  describe('confirmUnstake', () => {
    it('returns null when account is missing', async () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      let confirmation: TronUnstakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirmUnstake('10');
      });

      expect(confirmation).toBeNull();
      expect(mockConfirmTronUnstake).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls confirmTronUnstake with correct params using resourceType state', async () => {
      const confirmationResult: TronUnstakeResult = {
        valid: true,
        errors: ['Unstake decreases voting power'],
      };
      mockConfirmTronUnstake.mockResolvedValue(confirmationResult);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      // Set resourceType to bandwidth
      act(() => {
        result.current.setResourceType('bandwidth');
      });

      let confirmation: TronUnstakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirmUnstake('7');
      });

      expect(mockConfirmTronUnstake).toHaveBeenCalledWith(mockAccount, {
        value: '7',
        accountId: mockAccount.id,
        assetId: `${TrxScope.Mainnet}/slip44:195`,
        options: { purpose: 'BANDWIDTH' },
      });

      expect(confirmation).toEqual(confirmationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toEqual(['Unstake decreases voting power']);
    });

    it('uses default energy resourceType when not changed', async () => {
      const confirmationResult: TronUnstakeResult = {
        valid: true,
      };
      mockConfirmTronUnstake.mockResolvedValue(confirmationResult);

      const { result } = renderHook(() =>
        useTronUnstake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.confirmUnstake('10');
      });

      expect(mockConfirmTronUnstake).toHaveBeenCalledWith(
        mockAccount,
        expect.objectContaining({
          options: { purpose: 'ENERGY' },
        }),
      );
    });
  });
});

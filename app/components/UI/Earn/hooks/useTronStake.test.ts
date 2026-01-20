import { act, renderHook } from '@testing-library/react-hooks';
import { TrxScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import useTronStake from './useTronStake';
import {
  confirmTronStake,
  validateTronStakeAmount,
  computeStakeFee,
  TronStakeResult,
  ComputeStakeFeeResult,
} from '../utils/tron-staking-snap';
import { TokenI } from '../../Tokens/types';

const mockSelectSelectedInternalAccountByScope = jest.fn();
const mockSelectTrxStakingEnabled = jest.fn();

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

jest.mock('../utils/tron-staking-snap', () => ({
  confirmTronStake: jest.fn(),
  validateTronStakeAmount: jest.fn(),
  computeStakeFee: jest.fn(),
}));

jest.mock('../../../../core/Multichain/utils', () => ({
  isTronChainId: jest.fn((chainId: string) => chainId.startsWith('tron:')),
}));

describe('useTronStake', () => {
  const mockValidateTronStakeAmount =
    validateTronStakeAmount as jest.MockedFunction<
      typeof validateTronStakeAmount
    >;
  const mockConfirmTronStake = confirmTronStake as jest.MockedFunction<
    typeof confirmTronStake
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
  });

  describe('initialization', () => {
    it('returns isTronNative true for TRX token', () => {
      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      expect(result.current.isTronNative).toBe(true);
    });

    it('returns isTronNative false for non-TRX token', () => {
      const { result } = renderHook(() =>
        useTronStake({ token: mockNonTrxToken }),
      );

      expect(result.current.isTronNative).toBe(false);
    });

    it('returns isTronEnabled true when flag is on and token is TRX', () => {
      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      expect(result.current.isTronEnabled).toBe(true);
    });

    it('returns default resourceType as energy', () => {
      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      expect(result.current.resourceType).toBe('energy');
    });

    it('allows updating resourceType', () => {
      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      act(() => {
        result.current.setResourceType('bandwidth');
      });

      expect(result.current.resourceType).toBe('bandwidth');
    });

    it('returns tronAccountId from selected account', () => {
      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      expect(result.current.tronAccountId).toBe(mockAccount.id);
    });

    it('returns undefined tronAccountId when account is not selected', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      expect(result.current.tronAccountId).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('returns null when account is missing', async () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      let validation: TronStakeResult | null = null;
      await act(async () => {
        validation = await result.current.validateStakeAmount('10');
      });

      expect(validation).toBeNull();
      expect(mockValidateTronStakeAmount).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls validateTronStakeAmount with constructed assetId and updates state', async () => {
      const validationResult: TronStakeResult & { extra: string } = {
        valid: true,
        errors: undefined,
        extra: 'preview-data',
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      let validation: TronStakeResult | null = null;
      await act(async () => {
        validation = await result.current.validateStakeAmount('10');
      });

      expect(mockValidateTronStakeAmount).toHaveBeenCalledWith(mockAccount, {
        value: '10',
        accountId: mockAccount.id,
        assetId: `${TrxScope.Mainnet}/slip44:195`,
      });

      expect(validation).toEqual(validationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
      expect(result.current.preview).toEqual(
        expect.objectContaining({
          extra: 'preview-data',
        }),
      );
    });

    it('sets errors from validation result', async () => {
      const validationResult: TronStakeResult = {
        valid: false,
        errors: ['Amount exceeds balance'],
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateStakeAmount('1000');
      });

      expect(result.current.errors).toEqual(['Amount exceeds balance']);
    });

    it('includes fee in preview when computeStakeFee returns fee', async () => {
      const validationResult: TronStakeResult = { valid: true };
      const mockFee = {
        type: 'fee',
        asset: { unit: 'TRX', type: 'TRX', amount: '0.5', fungible: true },
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);
      mockComputeStakeFee.mockResolvedValue([mockFee] as ComputeStakeFeeResult);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateStakeAmount('10');
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
      const validationResult: TronStakeResult & { extra: string } = {
        valid: true,
        extra: 'preview-data',
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);
      mockComputeStakeFee.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateStakeAmount('10');
      });

      expect(result.current.preview).toEqual({
        valid: true,
        extra: 'preview-data',
      });
      expect(result.current.preview).not.toHaveProperty('fee');
    });

    it('does not include fee in preview when computeStakeFee throws', async () => {
      const validationResult: TronStakeResult & { extra: string } = {
        valid: true,
        extra: 'preview-data',
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);
      mockComputeStakeFee.mockRejectedValue(
        new Error('Fee computation failed'),
      );

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.validateStakeAmount('10');
      });

      expect(result.current.preview).toEqual({
        valid: true,
        extra: 'preview-data',
      });
      expect(result.current.preview).not.toHaveProperty('fee');
    });
  });

  describe('confirmStake', () => {
    it('returns null when account is missing', async () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      let confirmation: TronStakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirmStake('10');
      });

      expect(confirmation).toBeNull();
      expect(mockConfirmTronStake).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls confirmTronStake with correct params using resourceType state', async () => {
      const confirmationResult: TronStakeResult = {
        valid: true,
        errors: ['Warning: low remaining balance'],
      };
      mockConfirmTronStake.mockResolvedValue(confirmationResult);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      // Set resourceType to bandwidth
      act(() => {
        result.current.setResourceType('bandwidth');
      });

      let confirmation: TronStakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirmStake('25');
      });

      expect(mockConfirmTronStake).toHaveBeenCalledWith(mockAccount, {
        fromAccountId: mockAccount.id,
        assetId: `${TrxScope.Mainnet}/slip44:195`,
        value: '25',
        options: { purpose: 'BANDWIDTH' },
      });

      expect(confirmation).toEqual(confirmationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toEqual(['Warning: low remaining balance']);
    });

    it('uses default energy resourceType when not changed', async () => {
      const confirmationResult: TronStakeResult = {
        valid: true,
      };
      mockConfirmTronStake.mockResolvedValue(confirmationResult);

      const { result } = renderHook(() =>
        useTronStake({ token: mockTrxToken }),
      );

      await act(async () => {
        await result.current.confirmStake('10');
      });

      expect(mockConfirmTronStake).toHaveBeenCalledWith(
        mockAccount,
        expect.objectContaining({
          options: { purpose: 'ENERGY' },
        }),
      );
    });
  });
});

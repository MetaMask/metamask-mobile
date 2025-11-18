import { act, renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TrxScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { TronResourceType } from '../../../../core/Multichain/constants';
import useTronStake from './useTronStake';
import {
  confirmTronStake,
  validateTronStakeAmount,
  TronStakeResult,
} from '../utils/tron-staking';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../utils/tron-staking', () => ({
  confirmTronStake: jest.fn(),
  validateTronStakeAmount: jest.fn(),
}));

describe('useTronStake', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockValidateTronStakeAmount =
    validateTronStakeAmount as jest.MockedFunction<
      typeof validateTronStakeAmount
    >;
  const mockConfirmTronStake = confirmTronStake as jest.MockedFunction<
    typeof confirmTronStake
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

  const mockChainId = TrxScope.Mainnet;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation(() => () => mockAccount);
  });

  describe('validate', () => {
    it('returns null when account is missing', async () => {
      mockUseSelector.mockImplementation(() => () => undefined);

      const { result } = renderHook(() => useTronStake());

      let validation: TronStakeResult | null = null;
      await act(async () => {
        validation = await result.current.validate('10', mockChainId);
      });

      expect(validation).toBeNull();
      expect(mockValidateTronStakeAmount).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
      expect(result.current.preview).toBeUndefined();
    });

    it('returns null when chainId is missing', async () => {
      const { result } = renderHook(() => useTronStake());

      let validation: TronStakeResult | null = null;
      await act(async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        validation = await result.current.validate(
          '10',
          '' as unknown as string,
        );
      });

      expect(validation).toBeNull();
      expect(mockValidateTronStakeAmount).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
      expect(result.current.preview).toBeUndefined();
    });

    it('calls validateTronStakeAmount with constructed assetId and updates state', async () => {
      const validationResult: TronStakeResult & { extra: string } = {
        valid: true,
        errors: undefined,
        extra: 'preview-data',
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useTronStake());

      let validation: TronStakeResult | null = null;
      await act(async () => {
        validation = await result.current.validate('10', mockChainId);
      });

      expect(mockValidateTronStakeAmount).toHaveBeenCalledWith(mockAccount, {
        value: '10',
        accountId: mockAccount.id,
        assetId: `${mockChainId}/slip44:195`,
      });

      expect(validation).toEqual(validationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
      expect(result.current.preview).toEqual(
        expect.objectContaining({
          extra: 'preview-data',
        }),
      );
      expect(result.current.preview?.fee).toEqual({
        type: 'fee',
        asset: {
          unit: 'TRX',
          type: 'TRX',
          amount: '0.01',
          fungible: true,
        },
      });
    });

    it('sets errors from validation result', async () => {
      const validationResult: TronStakeResult = {
        valid: false,
        errors: ['Amount exceeds balance'],
      };
      mockValidateTronStakeAmount.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useTronStake());

      await act(async () => {
        await result.current.validate('1000', mockChainId);
      });

      expect(result.current.errors).toEqual(['Amount exceeds balance']);
      expect(result.current.preview).toEqual(
        expect.objectContaining({
          fee: {
            type: 'fee',
            asset: {
              unit: 'TRX',
              type: 'TRX',
              amount: '0.01',
              fungible: true,
            },
          },
        }),
      );
    });
  });

  describe('confirm', () => {
    it('returns null when account is missing', async () => {
      mockUseSelector.mockImplementation(() => () => undefined);

      const { result } = renderHook(() => useTronStake());

      let confirmation: TronStakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirm(
          '10',
          TronResourceType.ENERGY,
          mockChainId,
        );
      });

      expect(confirmation).toBeNull();
      expect(mockConfirmTronStake).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('returns null when chainId is missing', async () => {
      const { result } = renderHook(() => useTronStake());

      let confirmation: TronStakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirm(
          '10',
          TronResourceType.ENERGY,
          '' as unknown as string,
        );
      });

      expect(confirmation).toBeNull();
      expect(mockConfirmTronStake).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls confirmTronStake with correct params and updates errors', async () => {
      const confirmationResult: TronStakeResult = {
        valid: true,
        errors: ['Warning: low remaining balance'],
      };
      mockConfirmTronStake.mockResolvedValue(confirmationResult);

      const { result } = renderHook(() => useTronStake());

      let confirmation: TronStakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirm(
          '25',
          TronResourceType.BANDWIDTH,
          mockChainId,
        );
      });

      expect(mockConfirmTronStake).toHaveBeenCalledWith(mockAccount, {
        fromAccountId: mockAccount.id,
        assetId: `${mockChainId}/slip44:195`,
        value: '25',
        options: { purpose: TronResourceType.BANDWIDTH },
      });

      expect(confirmation).toEqual(confirmationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toEqual(['Warning: low remaining balance']);
    });
  });
});

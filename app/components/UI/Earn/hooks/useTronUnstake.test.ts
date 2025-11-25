import { act, renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TrxScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { TronResourceType } from '../../../../core/Multichain/constants';
import useTronUnstake from './useTronUnstake';
import {
  confirmTronUnstake,
  validateTronUnstakeAmount,
  TronUnstakeResult,
} from '../utils/tron-staking';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../utils/tron-staking', () => ({
  confirmTronUnstake: jest.fn(),
  validateTronUnstakeAmount: jest.fn(),
}));

describe('useTronUnstake', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockValidateTronUnstakeAmount =
    validateTronUnstakeAmount as jest.MockedFunction<
      typeof validateTronUnstakeAmount
    >;
  const mockConfirmTronUnstake = confirmTronUnstake as jest.MockedFunction<
    typeof confirmTronUnstake
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

      const { result } = renderHook(() => useTronUnstake());

      let validation: TronUnstakeResult | null = null;
      await act(async () => {
        validation = await result.current.validate(
          '10',
          TronResourceType.ENERGY,
          mockChainId,
        );
      });

      expect(validation).toBeNull();
      expect(mockValidateTronUnstakeAmount).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('returns null when chainId is missing', async () => {
      const { result } = renderHook(() => useTronUnstake());

      let validation: TronUnstakeResult | null = null;
      await act(async () => {
        validation = await result.current.validate(
          '10',
          TronResourceType.ENERGY,
          '' as unknown as string,
        );
      });

      expect(validation).toBeNull();
      expect(mockValidateTronUnstakeAmount).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls validateTronUnstakeAmount with constructed assetId and purpose and updates errors', async () => {
      const validationResult: TronUnstakeResult = {
        valid: true,
        errors: ['Unstake creates low remaining balance'],
      };
      mockValidateTronUnstakeAmount.mockResolvedValue(validationResult);

      const { result } = renderHook(() => useTronUnstake());

      let validation: TronUnstakeResult | null = null;
      await act(async () => {
        validation = await result.current.validate(
          '5',
          TronResourceType.BANDWIDTH,
          mockChainId,
        );
      });

      expect(mockValidateTronUnstakeAmount).toHaveBeenCalledWith(mockAccount, {
        value: '5',
        accountId: mockAccount.id,
        assetId: `${mockChainId}/slip44:195`,
        options: { purpose: TronResourceType.BANDWIDTH },
      });

      expect(validation).toEqual(validationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toEqual([
        'Unstake creates low remaining balance',
      ]);
    });
  });

  describe('confirm', () => {
    it('returns null when account is missing', async () => {
      mockUseSelector.mockImplementation(() => () => undefined);

      const { result } = renderHook(() => useTronUnstake());

      let confirmation: TronUnstakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirm(
          '10',
          TronResourceType.ENERGY,
          mockChainId,
        );
      });

      expect(confirmation).toBeNull();
      expect(mockConfirmTronUnstake).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('returns null when chainId is missing', async () => {
      const { result } = renderHook(() => useTronUnstake());

      let confirmation: TronUnstakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirm(
          '10',
          TronResourceType.ENERGY,
          '' as unknown as string,
        );
      });

      expect(confirmation).toBeNull();
      expect(mockConfirmTronUnstake).not.toHaveBeenCalled();
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toBeUndefined();
    });

    it('calls confirmTronUnstake with correct params and updates errors', async () => {
      const confirmationResult: TronUnstakeResult = {
        valid: true,
        errors: ['Unstake decreases voting power'],
      };
      mockConfirmTronUnstake.mockResolvedValue(confirmationResult);

      const { result } = renderHook(() => useTronUnstake());

      let confirmation: TronUnstakeResult | null = null;
      await act(async () => {
        confirmation = await result.current.confirm(
          '7',
          TronResourceType.BANDWIDTH,
          mockChainId,
        );
      });

      expect(mockConfirmTronUnstake).toHaveBeenCalledWith(mockAccount, {
        value: '7',
        accountId: mockAccount.id,
        assetId: `${mockChainId}/slip44:195`,
        options: { purpose: TronResourceType.BANDWIDTH },
      });

      expect(confirmation).toEqual(confirmationResult);
      expect(result.current.validating).toBe(false);
      expect(result.current.errors).toEqual(['Unstake decreases voting power']);
    });
  });
});

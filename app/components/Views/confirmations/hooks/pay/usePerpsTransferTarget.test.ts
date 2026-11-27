import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';

import { isLighterProviderEnabled } from '../../../../UI/Perps/utils/lighterFeatureFlags';
import { selectPerpsLighterProviderEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsAccountState,
  selectPerpsBalances,
} from '../../../../UI/Perps/selectors/perpsController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { useLighterTotalBalance } from '../../temp-lighter/useLighterWithdrawableBalance';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  usePerpsTransferBalance,
  usePerpsTransferSource,
  usePerpsTransferTarget,
} from './usePerpsTransferTarget';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../UI/Perps/utils/lighterFeatureFlags');
jest.mock('../../temp-lighter/useLighterWithdrawableBalance');

describe('usePerpsTransferTarget', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const isLighterProviderEnabledMock = jest.mocked(isLighterProviderEnabled);
  const useLighterTotalBalanceMock = jest.mocked(useLighterTotalBalance);
  let providerFlagEnabled: boolean;
  let accountState: { totalBalance: string } | null;
  let perpsBalances: { lighter?: { totalBalance: string } };

  beforeEach(() => {
    jest.resetAllMocks();
    providerFlagEnabled = true;
    accountState = { totalBalance: '4892.06' };
    perpsBalances = { lighter: { totalBalance: '4718.18' } };
    isLighterProviderEnabledMock.mockReturnValue(true);
    useLighterTotalBalanceMock.mockReturnValue(undefined);
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsWithdraw,
      txParams: {},
    } as never);
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPerpsLighterProviderEnabledFlag) {
        return providerFlagEnabled;
      }
      if (selector === selectPerpsAccountState) {
        return accountState;
      }
      if (selector === selectPerpsBalances) {
        return perpsBalances;
      }
      if (selector === selectSelectedInternalAccountAddress) {
        return '0xabc';
      }
      return undefined;
    });
  });

  describe('usePerpsTransferTarget', () => {
    it('targets Lighter on a Hyperliquid withdraw', () => {
      const { result } = renderHook(() => usePerpsTransferTarget());

      expect(result.current).toBe('lighter');
    });

    it('targets Hyperliquid on a Lighter withdraw', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.perpsLighterWithdraw,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePerpsTransferTarget());

      expect(result.current).toBe('hyperliquid');
    });

    it('reads the type of the nested transaction of a batch', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.batch,
        nestedTransactions: [{ type: TransactionType.perpsLighterWithdraw }],
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePerpsTransferTarget());

      expect(result.current).toBe('hyperliquid');
    });

    it('returns undefined outside a Perps withdraw', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.perpsDeposit,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePerpsTransferTarget());

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when the Lighter provider is off', () => {
      isLighterProviderEnabledMock.mockReturnValue(false);

      const { result } = renderHook(() => usePerpsTransferTarget());

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when the Lighter provider flag is off', () => {
      providerFlagEnabled = false;

      const { result } = renderHook(() => usePerpsTransferTarget());

      expect(result.current).toBeUndefined();
    });
  });

  describe('usePerpsTransferSource', () => {
    it.each([
      [TransactionType.perpsDeposit, 'lighter'],
      [TransactionType.perpsLighterDeposit, 'hyperliquid'],
    ])('pays a %s from the %s balance', (type, expected) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePerpsTransferSource());

      expect(result.current).toBe(expected);
    });

    it('returns undefined outside a Perps deposit', () => {
      const { result } = renderHook(() => usePerpsTransferSource());

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when the Lighter provider is off', () => {
      isLighterProviderEnabledMock.mockReturnValue(false);
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.perpsDeposit,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePerpsTransferSource());

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when the Lighter provider flag is off', () => {
      providerFlagEnabled = false;
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.perpsLighterDeposit,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePerpsTransferSource());

      expect(result.current).toBeUndefined();
    });
  });

  describe('usePerpsTransferBalance', () => {
    it('formats the Hyperliquid balance from the account state', () => {
      const { result } = renderHook(() =>
        usePerpsTransferBalance('hyperliquid'),
      );

      expect(result.current).toBe('$4,892.06');
    });

    it('formats the Lighter balance from the controller balances', () => {
      const { result } = renderHook(() => usePerpsTransferBalance('lighter'));

      expect(result.current).toBe('$4,718.18');
      expect(useLighterTotalBalanceMock).toHaveBeenCalledWith('0xabc', false);
    });

    it('falls back to the fetched Lighter balance without a controller entry', () => {
      perpsBalances = {};
      useLighterTotalBalanceMock.mockReturnValue('12.5');

      const { result } = renderHook(() => usePerpsTransferBalance('lighter'));

      expect(result.current).toBe('$12.50');
      expect(useLighterTotalBalanceMock).toHaveBeenCalledWith('0xabc', true);
    });

    it('returns undefined without a provider', () => {
      const { result } = renderHook(() => usePerpsTransferBalance(undefined));

      expect(result.current).toBeUndefined();
    });
  });
});

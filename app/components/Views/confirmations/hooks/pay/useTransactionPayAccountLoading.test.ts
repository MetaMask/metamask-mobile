import { act, renderHook } from '@testing-library/react-native';
import type { AccountGroupId } from '@metamask/account-api';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import EngineService from '../../../../../core/EngineService';
import {
  isAccountGroupAssetLoadPending,
  subscribeToAccountGroupAssetLoads,
} from '../../../../../core/Assets/accountGroupAssetLoader';
import { AssetType } from '../../types/token';
import { useAccountOverrideGroupId } from '../send/useAccountOverrideGroupId';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayAccountLoading } from './useTransactionPayAccountLoading';

jest.mock('../../../../../core/EngineService', () => ({
  __esModule: true,
  default: { flushState: jest.fn() },
}));

jest.mock('../../../../../core/Assets/accountGroupAssetLoader', () => ({
  isAccountGroupAssetLoadPending: jest.fn(),
  subscribeToAccountGroupAssetLoads: jest.fn(),
}));

jest.mock('../send/useAccountOverrideGroupId');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayAvailableTokens');

const GROUP_ID_MOCK = 'entropy:wallet-1/2' as AccountGroupId;
const TOKEN_MOCK = { address: '0x1', chainId: '0x1' } as AssetType;

describe('useTransactionPayAccountLoading', () => {
  const isPendingMock = jest.mocked(isAccountGroupAssetLoadPending);
  const subscribeMock = jest.mocked(subscribeToAccountGroupAssetLoads);
  const useAccountOverrideGroupIdMock = jest.mocked(useAccountOverrideGroupId);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );
  const flushStateMock = jest.mocked(EngineService.flushState);

  let notifyLoaderListeners: () => void;

  beforeEach(() => {
    jest.resetAllMocks();

    subscribeMock.mockImplementation((listener) => {
      notifyLoaderListeners = listener;
      return (): void => undefined;
    });

    isPendingMock.mockReturnValue(false);
    useAccountOverrideGroupIdMock.mockReturnValue(GROUP_ID_MOCK);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0xabc' },
    } as TransactionMeta);
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });
  });

  it('returns false when no account override is selected', () => {
    useAccountOverrideGroupIdMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useTransactionPayAccountLoading());

    expect(result.current).toBe(false);
  });

  it('returns false when the override account already has tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [TOKEN_MOCK],
      hasTokens: true,
    });

    const { result } = renderHook(() => useTransactionPayAccountLoading());

    expect(result.current).toBe(false);
  });

  it('returns false for post-quote withdraw transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0xabc' },
    } as TransactionMeta);
    isPendingMock.mockReturnValue(true);

    const { result } = renderHook(() => useTransactionPayAccountLoading());

    expect(result.current).toBe(false);
  });

  it('returns true while the override account asset load is in flight', () => {
    isPendingMock.mockReturnValue(true);

    const { result } = renderHook(() => useTransactionPayAccountLoading());

    expect(result.current).toBe(true);
    expect(flushStateMock).not.toHaveBeenCalled();
  });

  it('flushes pending state and stops loading once the asset load settles', () => {
    isPendingMock.mockReturnValue(true);

    const { result } = renderHook(() => useTransactionPayAccountLoading());

    expect(result.current).toBe(true);

    isPendingMock.mockReturnValue(false);

    act(() => {
      notifyLoaderListeners();
    });

    expect(flushStateMock).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(false);
  });

  it('stops loading without flushing when no asset load is needed', () => {
    const { result } = renderHook(() => useTransactionPayAccountLoading());

    expect(result.current).toBe(false);
    expect(flushStateMock).not.toHaveBeenCalled();
  });

  it('reports loading again when switching to another unloaded account', () => {
    const { result, rerender } = renderHook(() =>
      useTransactionPayAccountLoading(),
    );

    expect(result.current).toBe(false);

    const otherGroupId = 'entropy:wallet-1/3' as AccountGroupId;
    useAccountOverrideGroupIdMock.mockReturnValue(otherGroupId);
    isPendingMock.mockImplementation((groupId) => groupId === otherGroupId);

    rerender({});

    expect(result.current).toBe(true);
  });
});

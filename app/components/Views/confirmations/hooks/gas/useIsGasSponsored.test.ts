import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { useIsGasSponsored } from './useIsGasSponsored';
import { useIsGaslessSupported } from './useIsGaslessSupported';

jest.mock('../../../../../selectors/featureFlagController/gasFeesSponsored');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useIsGaslessSupported');

const MOCK_TRANSACTION_META = {
  id: '1',
  status: TransactionStatus.unapproved,
  type: TransactionType.contractInteraction,
  chainId: '0x1',
  simulationFails: undefined,
} as unknown as TransactionMeta;

const mockGetGasFeesSponsoredNetworkEnabled = jest.mocked(
  getGasFeesSponsoredNetworkEnabled,
);
const useIsGaslessSupportedMock = jest.mocked(useIsGaslessSupported);

describe('useIsCurrentTransactionGasSponsored', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(MOCK_TRANSACTION_META);
    mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => false);
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: false,
      pending: false,
      isSmartTransaction: false,
    });
  });

  it('returns true when network is gas sponsored and gasless enabled', () => {
    mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => true);
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: true,
      pending: false,
      isSmartTransaction: false,
    });
    const { result } = renderHookWithProvider(() => useIsGasSponsored());
    expect(result.current).toBe(true);
  });

  it('returns false when network is gas sponsored and gasless disabled', () => {
    mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => true);
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: false,
      pending: false,
      isSmartTransaction: false,
    });
    const { result } = renderHookWithProvider(() => useIsGasSponsored());
    expect(result.current).toBe(false);
  });

  it('returns false when network is NOT gas sponsored and gasless enabled', () => {
    mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => false);
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: true,
      pending: false,
      isSmartTransaction: false,
    });
    const { result } = renderHookWithProvider(() => useIsGasSponsored());
    expect(result.current).toBe(false);
  });

  it('returns false when transaction metadata is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(() => useIsGasSponsored());
    expect(result.current).toBe(false);
  });
});

import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useAddressTrustSignals } from '../useAddressTrustSignals';
import { useFirstTimeInteractionAlert } from './useFirstTimeInteractionAlert';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { TrustSignalDisplayState } from '../../types/trustSignals';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../useAddressTrustSignals', () => ({
  useAddressTrustSignals: jest.fn(),
}));

describe('useFirstTimeInteractionAlert', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockUseTransactionMetadataRequest =
    useTransactionMetadataRequest as jest.Mock;
  const mockUseAddressTrustSignals = useAddressTrustSignals as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue([]); // No internal accounts
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: false,
    });
    mockUseAddressTrustSignals.mockReturnValue([]);
  });

  it('returns empty array if no recipient', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {},
    });
    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });

  it('returns empty array if internal account', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xMyAccount' },
      isFirstTimeInteraction: true,
    });
    mockUseSelector.mockReturnValue([{ address: '0xMyAccount' }]);

    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });

  it('returns empty array if not first time interaction', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: false,
    });

    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });

  it('returns empty array if verified address', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: true,
    });
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Verified },
    ]);

    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });

  it('returns empty array if trust signal loading', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: true,
    });
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Loading },
    ]);

    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });

  it('returns alert if all conditions met', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: true,
    });
    // Assuming 'Neutral' or undefined state triggers the alert (as long as not Verified/Loading)
    mockUseAddressTrustSignals.mockReturnValue([{ state: 'SomeOtherState' }]);

    const { result } = renderHook(() => useFirstTimeInteractionAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.FirstTimeInteraction,
      severity: Severity.Warning,
      title: `1st interaction`,
      message: `You're interacting with this address for the first time. Make sure that it's correct before you continue.`,
    });
  });

  it('returns empty array when address is not in txParams.to ', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: undefined },
      isFirstTimeInteraction: true,
    });

    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });
});

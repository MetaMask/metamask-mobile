import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { TrustSignalDisplayState } from '../../types/trustSignals';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useAddressTrustSignal } from '../useAddressTrustSignals';
import { useFirstTimeInteractionAlert } from './useFirstTimeInteractionAlert';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../useAddressTrustSignals', () => ({
  useAddressTrustSignal: jest.fn(),
}));

jest.mock('../transactions/useTransferRecipient', () => ({
  useTransferRecipient: jest.fn(),
}));

describe('useFirstTimeInteractionAlert', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockUseTransactionMetadataRequest =
    useTransactionMetadataRequest as jest.Mock;
  const mockUseAddressTrustSignal = useAddressTrustSignal as jest.Mock;
  const contractAddress = '0xContractAddress';
  const tokenRecipient = '0xTokenRecipient';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue([]); // No internal accounts
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: false,
    });
    mockUseAddressTrustSignal.mockReturnValue({});
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
    mockUseAddressTrustSignal.mockReturnValue({
      state: TrustSignalDisplayState.Verified,
    });

    const { result } = renderHook(() => useFirstTimeInteractionAlert());
    expect(result.current).toEqual([]);
  });

  it('returns empty array if trust signal loading', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: '0xRecipient' },
      isFirstTimeInteraction: true,
    });
    mockUseAddressTrustSignal.mockReturnValue({
      state: TrustSignalDisplayState.Loading,
    });

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
    mockUseAddressTrustSignal.mockReturnValue({ state: 'SomeOtherState' });

    const { result } = renderHook(() => useFirstTimeInteractionAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.FirstTimeInteraction,
      severity: Severity.Warning,
      title: `1st interaction`,
      message: `You're interacting with this address for the first time. Make sure that it's correct before you continue.`,
    });
  });

  it('prioritizes recipient from useTransferRecipient', () => {
    // Mock the hook to return the actual recipient (e.g. from token data)
    (useTransferRecipient as jest.Mock).mockReturnValue(tokenRecipient);

    renderHook(() => useFirstTimeInteractionAlert());

    // Verify trust signal check is performed on the token recipient, not the contract
    expect(useAddressTrustSignal).toHaveBeenCalledWith(tokenRecipient, '0x1');
  });

  it('fallbacks to txParams.to if useTransferRecipient returns undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { to: contractAddress },
      isFirstTimeInteraction: true,
    });
    // Mock hook returning undefined (e.g. not a token transfer)
    (useTransferRecipient as jest.Mock).mockReturnValue(undefined);

    renderHook(() => useFirstTimeInteractionAlert());

    // Should fallback to the 'to' field in txParams
    expect(useAddressTrustSignal).toHaveBeenCalledWith(contractAddress, '0x1');
  });

  it('does not show alert if useTransferRecipient identifies an internal account', () => {
    // Even if txParams.to is external, if the parsed recipient is internal, hide alert
    (useTransferRecipient as jest.Mock).mockReturnValue('0xInternal');

    const { result } = renderHook(() => useFirstTimeInteractionAlert());

    expect(result.current).toHaveLength(0);
  });
});

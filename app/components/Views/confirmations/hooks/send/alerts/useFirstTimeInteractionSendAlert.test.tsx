import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { checkFirstTimeInteraction } from '../../../../../../util/transaction-controller';
import { useAsyncResult } from '../../../../../hooks/useAsyncResult';
import { useSendContext } from '../../../context/send-context/send-context';
import { TrustSignalDisplayState } from '../../../types/trustSignals';
import { useAddressTrustSignal } from '../../useAddressTrustSignals';
import { useFirstTimeInteractionSendAlert } from './useFirstTimeInteractionSendAlert';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../useAddressTrustSignals', () => ({
  useAddressTrustSignal: jest.fn(),
}));

jest.mock('../../../../../hooks/useAsyncResult', () => ({
  useAsyncResult: jest.fn(),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  checkFirstTimeInteraction: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'send.new_address_title': 'New address',
      'send.new_address_message': 'First time message',
      'send.continue': 'Continue',
    };
    return map[key] || key;
  },
}));

const mockUseSendContext = jest.mocked(useSendContext);
const mockUseSelector = jest.mocked(useSelector);
const mockUseAddressTrustSignal = jest.mocked(useAddressTrustSignal);
const mockUseAsyncResult = jest.mocked(useAsyncResult);

describe('useFirstTimeInteractionSendAlert', () => {
  const TO = '0xRecipientAddress';
  const FROM = '0xSenderAddress';
  const CHAIN_ID = '0x1';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendContext.mockReturnValue({
      to: TO,
      from: FROM,
      chainId: CHAIN_ID,
    } as unknown as ReturnType<typeof useSendContext>);

    mockUseSelector.mockReturnValue([]);

    mockUseAddressTrustSignal.mockReturnValue({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });

    mockUseAsyncResult.mockReturnValue({ pending: false, value: true });
  });

  it('returns alert when first-time interaction is detected', () => {
    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).not.toBeNull();
    expect(result.current.alert?.key).toBe('firstTimeInteraction');
    expect(result.current.alert?.title).toBe('New address');
    expect(result.current.alert?.acknowledgeButtonLabel).toBe('Continue');
    expect(result.current.isPending).toBe(false);
  });

  it('returns null alert when to is missing', () => {
    mockUseSendContext.mockReturnValue({
      to: undefined,
      from: FROM,
      chainId: CHAIN_ID,
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('returns null alert when from is missing', () => {
    mockUseSendContext.mockReturnValue({
      to: TO,
      from: undefined,
      chainId: CHAIN_ID,
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when chainId is missing', () => {
    mockUseSendContext.mockReturnValue({
      to: TO,
      from: FROM,
      chainId: undefined,
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when to is an internal account', () => {
    mockUseSelector.mockReturnValue([{ address: TO.toLowerCase() }]);

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns null alert when address is verified', () => {
    mockUseAddressTrustSignal.mockReturnValue({
      state: TrustSignalDisplayState.Verified,
      label: null,
    });

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('returns isPending true when trust signal is loading', () => {
    mockUseAddressTrustSignal.mockReturnValue({
      state: TrustSignalDisplayState.Loading,
      label: null,
    });

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(true);
  });

  it('returns isPending true when async check is pending', () => {
    mockUseAsyncResult.mockReturnValue({ pending: true });

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(true);
  });

  it('returns null alert when isFirstTime is false', () => {
    mockUseAsyncResult.mockReturnValue({ pending: false, value: false });

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('returns null alert when isFirstTime is undefined', () => {
    mockUseAsyncResult.mockReturnValue({ pending: false, value: undefined });

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.alert).toBeNull();
  });

  it('passes correct arguments to checkFirstTimeInteraction via useAsyncResult', () => {
    renderHook(() => useFirstTimeInteractionSendAlert());

    expect(mockUseAsyncResult).toHaveBeenCalled();
    const asyncFn = mockUseAsyncResult.mock.calls[0][0];

    asyncFn();

    expect(checkFirstTimeInteraction).toHaveBeenCalledWith({
      from: FROM,
      to: TO,
      chainId: 1,
    });
  });

  it('skips the async call when shouldSkip is true', async () => {
    mockUseSendContext.mockReturnValue({
      to: undefined,
      from: FROM,
      chainId: CHAIN_ID,
    } as unknown as ReturnType<typeof useSendContext>);

    renderHook(() => useFirstTimeInteractionSendAlert());

    const asyncFn = mockUseAsyncResult.mock.calls[0][0];

    await expect(asyncFn()).resolves.toBeUndefined();
    expect(checkFirstTimeInteraction).not.toHaveBeenCalled();
  });

  it('returns isPending false when shouldSkip is true even if async is pending', () => {
    mockUseSendContext.mockReturnValue({
      to: undefined,
      from: FROM,
      chainId: CHAIN_ID,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseAsyncResult.mockReturnValue({ pending: true });

    const { result } = renderHook(() => useFirstTimeInteractionSendAlert());

    expect(result.current.isPending).toBe(false);
  });
});

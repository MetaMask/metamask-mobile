import { renderHook, act } from '@testing-library/react-hooks';

import { useSendContext } from '../../../context/send-context/send-context';
import { useFirstTimeInteractionSendAlert } from './useFirstTimeInteractionSendAlert';
import { useTokenContractSendAlert } from './useTokenContractSendAlert';
import { useSendAlerts } from './useSendAlerts';

jest.mock('../../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useFirstTimeInteractionSendAlert', () => ({
  useFirstTimeInteractionSendAlert: jest.fn(),
}));

jest.mock('./useTokenContractSendAlert', () => ({
  useTokenContractSendAlert: jest.fn(),
}));

const mockUseSendContext = jest.mocked(useSendContext);
const mockUseFirstTimeInteraction = jest.mocked(
  useFirstTimeInteractionSendAlert,
);
const mockUseTokenContract = jest.mocked(useTokenContractSendAlert);

const TOKEN_ALERT = {
  key: 'tokenContract',
  title: 'Smart contract address',
  message: 'Token contract warning',
};

const FIRST_TIME_ALERT = {
  key: 'firstTimeInteraction',
  title: 'New address',
  message: 'First time message',
  acknowledgeButtonLabel: 'Continue',
};

describe('useSendAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendContext.mockReturnValue({
      to: '0xRecipient',
    } as unknown as ReturnType<typeof useSendContext>);

    mockUseTokenContract.mockReturnValue({
      alert: null,
      isPending: false,
    });

    mockUseFirstTimeInteraction.mockReturnValue({
      alert: null,
      isPending: false,
    });
  });

  it('returns empty alerts when no sub-hooks produce alerts', () => {
    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.alerts).toEqual([]);
    expect(result.current.hasUnacknowledgedAlerts).toBe(false);
    expect(result.current.isAlertCheckPending).toBe(false);
  });

  it('collects token contract alert', () => {
    mockUseTokenContract.mockReturnValue({
      alert: TOKEN_ALERT,
      isPending: false,
    });

    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.alerts).toEqual([TOKEN_ALERT]);
    expect(result.current.hasUnacknowledgedAlerts).toBe(true);
  });

  it('collects first-time interaction alert', () => {
    mockUseFirstTimeInteraction.mockReturnValue({
      alert: FIRST_TIME_ALERT,
      isPending: false,
    });

    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.alerts).toEqual([FIRST_TIME_ALERT]);
    expect(result.current.hasUnacknowledgedAlerts).toBe(true);
  });

  it('collects both alerts in order: token contract first', () => {
    mockUseTokenContract.mockReturnValue({
      alert: TOKEN_ALERT,
      isPending: false,
    });
    mockUseFirstTimeInteraction.mockReturnValue({
      alert: FIRST_TIME_ALERT,
      isPending: false,
    });

    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.alerts).toEqual([TOKEN_ALERT, FIRST_TIME_ALERT]);
    expect(result.current.hasUnacknowledgedAlerts).toBe(true);
  });

  it('reports isAlertCheckPending when token contract check is pending', () => {
    mockUseTokenContract.mockReturnValue({
      alert: null,
      isPending: true,
    });

    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.isAlertCheckPending).toBe(true);
  });

  it('reports isAlertCheckPending when first-time check is pending', () => {
    mockUseFirstTimeInteraction.mockReturnValue({
      alert: null,
      isPending: true,
    });

    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.isAlertCheckPending).toBe(true);
  });

  it('acknowledgeAlerts sets hasUnacknowledgedAlerts to false', () => {
    mockUseTokenContract.mockReturnValue({
      alert: TOKEN_ALERT,
      isPending: false,
    });

    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.hasUnacknowledgedAlerts).toBe(true);

    act(() => {
      result.current.acknowledgeAlerts();
    });

    expect(result.current.hasUnacknowledgedAlerts).toBe(false);
  });

  it('resets acknowledged state when to changes', () => {
    mockUseTokenContract.mockReturnValue({
      alert: TOKEN_ALERT,
      isPending: false,
    });

    const { result, rerender } = renderHook(() => useSendAlerts());

    act(() => {
      result.current.acknowledgeAlerts();
    });

    expect(result.current.hasUnacknowledgedAlerts).toBe(false);

    mockUseSendContext.mockReturnValue({
      to: '0xNewRecipient',
    } as unknown as ReturnType<typeof useSendContext>);

    rerender();

    expect(result.current.hasUnacknowledgedAlerts).toBe(true);
  });

  it('returns hasUnacknowledgedAlerts false when alerts are empty even without acknowledging', () => {
    const { result } = renderHook(() => useSendAlerts());

    expect(result.current.alerts).toEqual([]);
    expect(result.current.hasUnacknowledgedAlerts).toBe(false);
  });
});

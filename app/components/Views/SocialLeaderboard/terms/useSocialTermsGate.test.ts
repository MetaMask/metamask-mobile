import { act, renderHook } from '@testing-library/react-native';
import { SocialEvent } from '../analytics/socialEvents';
import { useSocialTermsGate } from './useSocialTermsGate';
import { ensureSocialTermsAccepted } from './socialTermsAcceptance';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('./socialTermsAcceptance', () => ({
  ensureSocialTermsAccepted: jest.fn(),
}));

const mockEnsure = jest.mocked(ensureSocialTermsAccepted);

const GATE = { trigger: SocialEvent.OnboardingTrigger.FOLLOW };

describe('useSocialTermsGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the terms are accepted', () => {
    mockEnsure.mockReturnValue(true);
    const { result } = renderHook(() => useSocialTermsGate());

    expect(result.current.ensureSocialTermsAccepted(GATE)).toBe(true);
    expect(mockEnsure).toHaveBeenCalledWith(mockNavigate, {
      trigger: GATE.trigger,
      onAccepted: undefined,
      runNavigation: undefined,
    });
  });

  it('passes the gated trigger and the blocked action through to the gate', () => {
    mockEnsure.mockReturnValue(false);
    const onAccepted = jest.fn();
    const { result } = renderHook(() => useSocialTermsGate());

    result.current.ensureSocialTermsAccepted(GATE, onAccepted);

    expect(mockEnsure).toHaveBeenCalledWith(mockNavigate, {
      trigger: GATE.trigger,
      onAccepted,
      runNavigation: undefined,
    });
  });

  it('passes runNavigation through to the gate', () => {
    mockEnsure.mockReturnValue(false);
    const runNavigation = jest.fn();
    const { result } = renderHook(() => useSocialTermsGate({ runNavigation }));

    result.current.ensureSocialTermsAccepted(GATE);

    expect(mockEnsure).toHaveBeenCalledWith(mockNavigate, {
      trigger: GATE.trigger,
      onAccepted: undefined,
      runNavigation,
    });
  });

  it('returns false when the terms are not accepted', () => {
    mockEnsure.mockReturnValue(false);
    const { result } = renderHook(() => useSocialTermsGate());

    expect(result.current.ensureSocialTermsAccepted(GATE)).toBe(false);
  });

  it('reports the redirect to onBlocked with the gate trigger and the terms reason', () => {
    mockEnsure.mockReturnValue(false);
    const onBlocked = jest.fn();
    const { result } = renderHook(() => useSocialTermsGate({ onBlocked }));

    act(() => {
      result.current.ensureSocialTermsAccepted({
        trigger: SocialEvent.OnboardingTrigger.COPY_TRADE,
        tradeType: SocialEvent.Trade.PERPS,
      });
    });

    expect(onBlocked).toHaveBeenCalledWith({
      blocked_action: SocialEvent.OnboardingTrigger.COPY_TRADE,
      blocked_reason: SocialEvent.BlockedReason.TERMS,
      trade_type: SocialEvent.Trade.PERPS,
    });
  });

  it('does not report onBlocked when the terms are accepted', () => {
    mockEnsure.mockReturnValue(true);
    const onBlocked = jest.fn();
    const { result } = renderHook(() => useSocialTermsGate({ onBlocked }));

    result.current.ensureSocialTermsAccepted(GATE);

    expect(onBlocked).not.toHaveBeenCalled();
  });
});

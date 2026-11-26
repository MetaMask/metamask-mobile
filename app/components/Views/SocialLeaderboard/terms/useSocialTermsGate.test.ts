import { renderHook } from '@testing-library/react-native';
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

describe('useSocialTermsGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the terms are accepted', () => {
    mockEnsure.mockReturnValue(true);
    const { result } = renderHook(() => useSocialTermsGate());

    expect(result.current.ensureSocialTermsAccepted()).toBe(true);
    expect(mockEnsure).toHaveBeenCalledWith(mockNavigate, undefined, undefined);
  });

  it('passes the blocked action through to the gate', () => {
    mockEnsure.mockReturnValue(false);
    const onAccepted = jest.fn();
    const { result } = renderHook(() => useSocialTermsGate());

    result.current.ensureSocialTermsAccepted(onAccepted);

    expect(mockEnsure).toHaveBeenCalledWith(
      mockNavigate,
      onAccepted,
      undefined,
    );
  });

  it('passes runNavigation through to the gate', () => {
    mockEnsure.mockReturnValue(false);
    const runNavigation = jest.fn();
    const { result } = renderHook(() => useSocialTermsGate({ runNavigation }));

    result.current.ensureSocialTermsAccepted();

    expect(mockEnsure).toHaveBeenCalledWith(
      mockNavigate,
      undefined,
      runNavigation,
    );
  });

  it('returns false when the terms are not accepted', () => {
    mockEnsure.mockReturnValue(false);
    const { result } = renderHook(() => useSocialTermsGate());

    expect(result.current.ensureSocialTermsAccepted()).toBe(false);
  });
});

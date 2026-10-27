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
    expect(mockEnsure).toHaveBeenCalledWith(mockNavigate);
  });

  it('returns false when the terms are not accepted', () => {
    mockEnsure.mockReturnValue(false);
    const { result } = renderHook(() => useSocialTermsGate());

    expect(result.current.ensureSocialTermsAccepted()).toBe(false);
  });
});

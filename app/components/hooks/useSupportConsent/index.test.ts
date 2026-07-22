import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSupportConsent } from './index';
import { navigateToSupportConsent } from '../../../util/support';

jest.mock('../../../util/support', () => ({
  navigateToSupportConsent: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('useSupportConsent', () => {
  const mockOpen = jest.fn();
  const mockNavigation = { navigate: mockNavigate } as unknown as ReturnType<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue(mockNavigation);
  });

  it('delegates to navigateToSupportConsent with the navigation object, open callback, and base URL', () => {
    const { result } = renderHook(() => useSupportConsent());

    result.current.openSupportWithConsent(
      mockOpen,
      'https://support.metamask.io/',
    );

    expect(navigateToSupportConsent).toHaveBeenCalledWith(
      mockNavigation,
      mockOpen,
      'https://support.metamask.io/',
      undefined,
    );
  });

  it('delegates to navigateToSupportConsent without a base URL when none is provided', () => {
    const { result } = renderHook(() => useSupportConsent());

    result.current.openSupportWithConsent(mockOpen);

    expect(navigateToSupportConsent).toHaveBeenCalledWith(
      mockNavigation,
      mockOpen,
      undefined,
      undefined,
    );
  });

  it('forwards the onOpenSupport callback as the fourth argument to navigateToSupportConsent', () => {
    const mockOnOpenSupport = jest.fn();
    const { result } = renderHook(() => useSupportConsent());

    result.current.openSupportWithConsent(
      mockOpen,
      'https://support.metamask.io/',
      mockOnOpenSupport,
    );

    expect(navigateToSupportConsent).toHaveBeenCalledWith(
      mockNavigation,
      mockOpen,
      'https://support.metamask.io/',
      mockOnOpenSupport,
    );
  });
});

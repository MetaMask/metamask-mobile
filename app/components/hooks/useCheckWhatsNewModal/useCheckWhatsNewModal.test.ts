import { renderHook } from '@testing-library/react-hooks';
import useCheckWhatsNewModal from './useCheckWhatsNewModal';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Routes from '../../../constants/navigation/Routes';

// Mock the navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the shouldShowWhatsNewModal function
jest.mock('../../../util/onboarding', () => ({
  shouldShowWhatsNewModal: jest.fn(),
}));

const mockShouldShowWhatsNewModal =
  shouldShowWhatsNewModal as jest.MockedFunction<
    typeof shouldShowWhatsNewModal
  >;

describe('useCheckWhatsNewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to WhatsNewModal when shouldShowWhatsNewModal returns true', async () => {
    mockShouldShowWhatsNewModal.mockResolvedValue(true);

    renderHook(() => useCheckWhatsNewModal());

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WHATS_NEW,
    });
  });

  it('should not navigate when shouldShowWhatsNewModal returns false', async () => {
    mockShouldShowWhatsNewModal.mockResolvedValue(false);

    renderHook(() => useCheckWhatsNewModal());

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockShouldShowWhatsNewModal.mockRejectedValue(new Error('Storage error'));

    expect(() => {
      renderHook(() => useCheckWhatsNewModal());
    }).not.toThrow();

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error checking WhatsNewModal state:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

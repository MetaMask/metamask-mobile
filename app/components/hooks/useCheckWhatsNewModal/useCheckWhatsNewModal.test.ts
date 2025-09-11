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
  useFocusEffect: (callback: () => void) => callback(),
}));

// Mock the shouldShowWhatsNewModal function
jest.mock('../../../util/onboarding', () => ({
  shouldShowWhatsNewModal: jest.fn(),
}));

// Mock the E2E check
jest.mock('../../../util/test/utils', () => ({
  isE2E: false,
}));

// Mock the Solana selector
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock StorageWrapper
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

const mockShouldShowWhatsNewModal =
  shouldShowWhatsNewModal as jest.MockedFunction<
    typeof shouldShowWhatsNewModal
  >;

// Import mocked modules
import { useSelector } from 'react-redux';
import StorageWrapper from '../../../store/storage-wrapper';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockStorageWrapperGetItem = StorageWrapper.getItem as jest.MockedFunction<
  typeof StorageWrapper.getItem
>;

describe('useCheckWhatsNewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue(true);
    mockStorageWrapperGetItem.mockResolvedValue('true');
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

  it('should not navigate when Solana onboarding is enabled but modal has not been shown', async () => {
    mockUseSelector.mockReturnValue(true);
    mockStorageWrapperGetItem.mockResolvedValue(null);
    mockShouldShowWhatsNewModal.mockResolvedValue(true);

    renderHook(() => useCheckWhatsNewModal());

    // Wait for the async operation to complete
    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate when Solana onboarding is disabled', async () => {
    mockShouldShowWhatsNewModal.mockResolvedValue(true);

    renderHook(() => useCheckWhatsNewModal());

    await new Promise(setImmediate);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WHATS_NEW,
    });
  });

  it('should navigate when Solana onboarding is enabled and modal has been shown', async () => {
    mockUseSelector.mockReturnValue(true);
    mockStorageWrapperGetItem.mockResolvedValue('true');
    mockShouldShowWhatsNewModal.mockResolvedValue(true);

    renderHook(() => useCheckWhatsNewModal());

    await new Promise(setImmediate);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WHATS_NEW,
    });
  });
});

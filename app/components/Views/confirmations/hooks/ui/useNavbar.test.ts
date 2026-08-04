import { renderHook } from '@testing-library/react-hooks';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import { useConfirmationContext } from '../../context/confirmation-context';
import useNavbar from './useNavbar';

jest.mock('./useFullScreenConfirmation', () => ({
  useFullScreenConfirmation: jest.fn(),
}));

jest.mock('../../context/confirmation-context', () => ({
  useConfirmationContext: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
  })),
}));

const mockUseConfirmationContext = jest.mocked(useConfirmationContext);

describe('useNavbar', () => {
  const mockTitle = 'Test Title';
  const mockSetNavHeaderConfig = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    mockUseConfirmationContext.mockReturnValue({
      setNavHeaderConfig: mockSetNavHeaderConfig,
    } as unknown as ReturnType<typeof useConfirmationContext>);
  });

  it('registers inline nav header config before paint for full screen confirmations', () => {
    renderHook(() => useNavbar(mockTitle));

    expect(mockSetNavHeaderConfig).toHaveBeenCalledWith({
      title: mockTitle,
      addBackButton: true,
      overrides: undefined,
    });
  });

  it('does not register nav header for non-full-screen confirmations', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: false,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(mockSetNavHeaderConfig).not.toHaveBeenCalled();
  });

  it('clears nav header config on unmount', () => {
    const { unmount } = renderHook(() => useNavbar(mockTitle));

    unmount();

    expect(mockSetNavHeaderConfig).toHaveBeenLastCalledWith(null);
  });

  it('updates nav header config when title changes', () => {
    const { rerender } = renderHook(({ title }) => useNavbar(title), {
      initialProps: { title: 'Initial Title' },
    });

    expect(mockSetNavHeaderConfig).toHaveBeenCalledWith({
      title: 'Initial Title',
      addBackButton: true,
      overrides: undefined,
    });

    rerender({ title: 'Updated Title' });

    expect(mockSetNavHeaderConfig).toHaveBeenCalledWith({
      title: 'Updated Title',
      addBackButton: true,
      overrides: undefined,
    });
  });

  describe('overrides parameter', () => {
    it('passes overrides when provided', () => {
      const mockHeaderTitle = jest.fn();
      const mockHeaderLeft = jest.fn();
      const overrides = {
        headerTitle: mockHeaderTitle,
        headerLeft: mockHeaderLeft,
      };

      renderHook(() => useNavbar(mockTitle, true, overrides));

      expect(mockSetNavHeaderConfig).toHaveBeenCalledWith({
        title: mockTitle,
        addBackButton: true,
        overrides,
      });
    });

    it('passes addBackButton false when requested', () => {
      renderHook(() => useNavbar(mockTitle, false));

      expect(mockSetNavHeaderConfig).toHaveBeenCalledWith({
        title: mockTitle,
        addBackButton: false,
        overrides: undefined,
      });
    });
  });
});

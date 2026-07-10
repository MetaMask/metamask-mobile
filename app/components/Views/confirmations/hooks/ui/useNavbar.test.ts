import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../../../util/theme/models';
import { getNavbar } from '../../components/UI/navbar/navbar';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import useNavbar from './useNavbar';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../components/UI/navbar/navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('./useFullScreenConfirmation', () => ({
  useFullScreenConfirmation: jest.fn(),
}));

describe('useNavbar', () => {
  const mockSetOptions = jest.fn();
  const mockOnReject = jest.fn();
  const mockTitle = 'Test Title';

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: mockSetOptions,
    });

    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: mockOnReject,
    });

    (getNavbar as jest.Mock).mockReturnValue({
      headerTitle: () => null,
      headerLeft: () => null,
    });

    // Default to full screen confirmation for existing tests
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: true,
    });
  });

  it('calls setOptions with the correct navbar configuration for full screen confirmations', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
    expect(useFullScreenConfirmation).toHaveBeenCalled();
    expect(getNavbar).toHaveBeenCalledWith({
      title: mockTitle,
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
      overrides: undefined,
    });
    expect(mockSetOptions).toHaveBeenCalledWith(
      getNavbar({
        title: mockTitle,
        onReject: mockOnReject,
        addBackButton: true,
        theme: {} as Theme,
      }),
    );
  });

  it('does not call setOptions for non-full-screen confirmations', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: false,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
    expect(useFullScreenConfirmation).toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(getNavbar).not.toHaveBeenCalled();
  });

  it('does not call setOptions when isFullScreenConfirmation is false', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: false,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
    expect(useFullScreenConfirmation).toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(getNavbar).not.toHaveBeenCalled();
  });

  it('updates navigation options when title changes for full screen confirmations', () => {
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    const { rerender } = renderHook(({ title }) => useNavbar(title), {
      initialProps: { title: 'Initial Title' },
    });

    expect(mockSetOptions).toHaveBeenCalledTimes(1);

    rerender({ title: 'Updated Title' });

    expect(mockSetOptions).toHaveBeenCalledTimes(2);
    expect(getNavbar).toHaveBeenLastCalledWith({
      title: 'Updated Title',
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
      overrides: undefined,
    });
  });

  it('updates navigation options when onReject changes for full screen confirmations', () => {
    const newOnReject = jest.fn();
    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: newOnReject,
    });
    (useFullScreenConfirmation as jest.Mock).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(getNavbar).toHaveBeenCalledWith({
      title: mockTitle,
      onReject: newOnReject,
      addBackButton: true,
      theme: expect.any(Object),
      overrides: undefined,
    });
  });

  describe('overrides parameter', () => {
    it('passes overrides to getNavbar when provided', () => {
      (useFullScreenConfirmation as jest.Mock).mockReturnValue({
        isFullScreenConfirmation: true,
      });

      const mockHeaderTitle = jest.fn();
      const mockHeaderLeft = jest.fn();
      const overrides = {
        headerTitle: mockHeaderTitle,
        headerLeft: mockHeaderLeft,
      };

      renderHook(() => useNavbar(mockTitle, true, overrides));

      expect(getNavbar).toHaveBeenCalledWith({
        title: mockTitle,
        onReject: mockOnReject,
        addBackButton: true,
        theme: expect.any(Object),
        overrides,
      });
    });

    it('passes undefined overrides when not provided', () => {
      (useFullScreenConfirmation as jest.Mock).mockReturnValue({
        isFullScreenConfirmation: true,
      });

      renderHook(() => useNavbar(mockTitle, false));

      expect(getNavbar).toHaveBeenCalledWith({
        title: mockTitle,
        onReject: mockOnReject,
        addBackButton: false,
        theme: expect.any(Object),
        overrides: undefined,
      });
    });
  });
});

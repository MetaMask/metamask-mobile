import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { getNavbar } from '../../components/UI/navbar/navbar';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import useNavbar from './useNavbar';

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
      header: () => null,
    });

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
    });
    expect(mockSetOptions).toHaveBeenCalledWith(
      getNavbar({
        title: mockTitle,
        onReject: mockOnReject,
        addBackButton: true,
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
    });
  });
});

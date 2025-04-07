import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../../../util/theme/models';
import { getNavbar } from '../components/Confirm/Navbar/Navbar';
import { useConfirmActions } from './useConfirmActions';
import useNavbar from './useNavbar';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../components/Confirm/Navbar/Navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('./useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
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
  });

  it('should call setOptions with the correct navbar configuration', () => {
    renderHook(() => useNavbar(mockTitle));

    expect(useNavigation).toHaveBeenCalled();
    expect(useConfirmActions).toHaveBeenCalled();
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
        theme: {} as Theme,
      }),
    );
  });

  it('should update navigation options when title changes', () => {
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

  it('should update navigation options when onReject changes', () => {
    const newOnReject = jest.fn();
    (useConfirmActions as jest.Mock).mockReturnValue({
      onReject: newOnReject,
    });

    renderHook(() => useNavbar(mockTitle));

    expect(getNavbar).toHaveBeenCalledWith({
      title: mockTitle,
      onReject: newOnReject,
      addBackButton: true,
    });
  });
});

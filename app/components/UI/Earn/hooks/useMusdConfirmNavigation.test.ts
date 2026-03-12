import { act, renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { useMusdConfirmNavigation } from './useMusdConfirmNavigation';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

describe('useMusdConfirmNavigation', () => {
  const useSelectorMock = useSelector as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('goes back when quick convert is enabled and navigation can go back', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to wallet view when quick convert is enabled and cannot go back', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(false);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('navigates to wallet view when quick convert is disabled', () => {
    useSelectorMock.mockReturnValue(false);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockCanGoBack).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });
});

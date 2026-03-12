import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useModalCloseOnQuoteExpiry } from './index';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import Routes from '../../../../../constants/navigation/Routes';
import { CommonActions } from '@react-navigation/native';

jest.mock('../useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
}));

const mockUseBridgeQuoteData = {
  isExpired: false,
  willRefresh: false,
};

describe('useModalCloseOnQuoteExpiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteData)
      .mockReturnValue(
        mockUseBridgeQuoteData as ReturnType<typeof useBridgeQuoteData>,
      );
  });

  it('dispatches a reset to QuoteExpiredModal when quote is expired and will not refresh', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    expect(mockDispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL }],
      }),
    );
  });

  it('does not dispatch when quote is not expired', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: false,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when quote is expired but will refresh', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: true,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches again when quote transitions from not-expired to expired', () => {
    // Arrange – start with not expired
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: false,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    const { rerender } = renderHookWithProvider(() =>
      useModalCloseOnQuoteExpiry(),
    );

    expect(mockDispatch).not.toHaveBeenCalled();

    // Quote expires
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    rerender({});

    // Assert
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL }],
      }),
    );
  });

  it('dispatches reset with index 0 so QuoteExpiredModal is the only route', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    const dispatchedAction = mockDispatch.mock.calls[0][0];
    expect(dispatchedAction.payload.index).toBe(0);
    expect(dispatchedAction.payload.routes).toHaveLength(1);
    expect(dispatchedAction.payload.routes[0].name).toBe(
      Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
    );
  });
});

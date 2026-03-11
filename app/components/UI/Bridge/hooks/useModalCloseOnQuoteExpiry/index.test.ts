import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useModalCloseOnQuoteExpiry } from './index';
import { useBridgeQuoteData } from '../useBridgeQuoteData';

jest.mock('../useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

const mockUseBridgeQuoteData = {
  needsNewQuote: false,
};

describe('useModalCloseOnQuoteExpiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    jest
      .mocked(useBridgeQuoteData)
      .mockReturnValue(
        mockUseBridgeQuoteData as ReturnType<typeof useBridgeQuoteData>,
      );
  });

  it('calls goBack when needsNewQuote is true and can go back', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      needsNewQuote: true,
    } as ReturnType<typeof useBridgeQuoteData>);
    mockCanGoBack.mockReturnValue(true);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call goBack when needsNewQuote is false', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      needsNewQuote: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not call goBack when needsNewQuote is true but cannot go back', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      needsNewQuote: true,
    } as ReturnType<typeof useBridgeQuoteData>);
    mockCanGoBack.mockReturnValue(false);

    // Act
    renderHookWithProvider(() => useModalCloseOnQuoteExpiry());

    // Assert
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('calls goBack when needsNewQuote transitions from false to true', () => {
    // Arrange – start with needsNewQuote false
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      needsNewQuote: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    const { rerender } = renderHookWithProvider(() =>
      useModalCloseOnQuoteExpiry(),
    );

    expect(mockGoBack).not.toHaveBeenCalled();

    // needsNewQuote becomes true
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      needsNewQuote: true,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    rerender({});

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call goBack when needsNewQuote remains false', () => {
    // Arrange
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      needsNewQuote: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    const { rerender } = renderHookWithProvider(() =>
      useModalCloseOnQuoteExpiry(),
    );

    rerender({});

    // Assert
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

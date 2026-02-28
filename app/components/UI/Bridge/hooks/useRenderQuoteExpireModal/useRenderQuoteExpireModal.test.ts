import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useRenderQuoteExpireModal } from './index';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import Routes from '../../../../../constants/navigation/Routes';
import { BigNumber } from 'ethers';

// Mock useBridgeQuoteData
const mockUseBridgeQuoteData = {
  isExpired: false,
  willRefresh: false,
};
jest.mock('../useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

// Mock redux selectors
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectIsSelectingRecipient: jest.fn().mockReturnValue(false),
  selectIsSelectingToken: jest.fn().mockReturnValue(false),
  selectIsSubmittingTx: jest.fn().mockReturnValue(false),
}));

import {
  selectIsSelectingRecipient,
  selectIsSelectingToken,
  selectIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: jest.fn(),
  }),
}));

const createMockInputRef = () => ({
  current: {
    blur: jest.fn(),
    focus: jest.fn(),
    isFocused: jest.fn().mockReturnValue(false),
  },
});

const mockLatestSourceBalance = {
  displayBalance: '2.0',
  atomicBalance: BigNumber.from('2000000000000000000'),
};

describe('useRenderQuoteExpireModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteData)
      .mockReturnValue(
        mockUseBridgeQuoteData as ReturnType<typeof useBridgeQuoteData>,
      );
    jest.mocked(selectIsSelectingRecipient).mockReturnValue(false);
    jest.mocked(selectIsSelectingToken).mockReturnValue(false);
    jest.mocked(selectIsSubmittingTx).mockReturnValue(false);
  });

  it('navigates to quote expired modal when quote is expired and will not refresh', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(inputRef.current.blur).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
    });
  });

  it('does not navigate when quote is not expired', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: false,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(inputRef.current.blur).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when quote is expired but will refresh', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: true,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(inputRef.current.blur).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when user is selecting a recipient', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(selectIsSelectingRecipient).mockReturnValue(true);
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when user is selecting a token', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(selectIsSelectingToken).mockReturnValue(true);
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when a transaction is being submitted', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(selectIsSubmittingTx).mockReturnValue(true);
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not show modal twice for the same expiry cycle', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act – render once (modal shown), then rerender
    const { rerender } = renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // Trigger a rerender with same expired state
    rerender({});

    // Assert – should still only have been called once
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('resets and shows modal again after quote recovers then expires again', () => {
    // Arrange
    const inputRef = createMockInputRef();

    // First render: expired
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    const { rerender } = renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // Quote recovers (not expired anymore)
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: false,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    rerender({});

    // Quote expires again
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    rerender({});

    // Assert – modal shown a second time
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('blurs the input ref before navigating', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: mockLatestSourceBalance,
      }),
    );

    // Assert
    expect(inputRef.current.blur).toHaveBeenCalledTimes(1);
  });

  it('handles null inputRef.current gracefully', () => {
    // Arrange
    const inputRef = { current: null };
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act & Assert – should not throw
    expect(() =>
      renderHookWithProvider(() =>
        useRenderQuoteExpireModal({
          inputRef,
          latestSourceBalance: mockLatestSourceBalance,
        }),
      ),
    ).not.toThrow();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
    });
  });

  it('handles undefined latestSourceBalance', () => {
    // Arrange
    const inputRef = createMockInputRef();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      isExpired: true,
      willRefresh: false,
    } as ReturnType<typeof useBridgeQuoteData>);

    // Act
    renderHookWithProvider(() =>
      useRenderQuoteExpireModal({
        inputRef,
        latestSourceBalance: undefined,
      }),
    );

    // Assert – should still show the modal
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
    });
  });
});

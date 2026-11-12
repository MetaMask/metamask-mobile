import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NewUserSheet from './NewUserSheet';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { NewUserSheetSelectorsIDs } from './NewUserSheet.testIds';

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

jest.mock('@metamask/design-system-react-native', () => {
  const MockReact = jest.requireActual('react');
  const MockBottomSheet = MockReact.forwardRef(
    (
      { children }: { children: React.ReactNode },
      ref: React.ForwardedRef<
        import('@metamask/design-system-react-native').BottomSheetRef
      >,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
      }));
      return children;
    },
  );
  MockBottomSheet.displayName = 'MockBottomSheet';
  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    BottomSheet: MockBottomSheet,
  };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const MockMaskedView = ({ children }: { children: React.ReactNode }) =>
    children;
  MockMaskedView.displayName = 'MaskedView';
  return { __esModule: true, default: MockMaskedView };
});

jest.mock('react-native-linear-gradient', () => {
  const MockLinearGradient = ({ children }: { children: React.ReactNode }) =>
    children;
  MockLinearGradient.displayName = 'LinearGradient';
  return { __esModule: true, default: MockLinearGradient };
});

describe('NewUserSheet', () => {
  const mockOnClose = jest.fn();
  const defaultProps = { isVisible: true, onClose: mockOnClose };

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when not visible', () => {
    const { queryByTestId } = renderWithProvider(
      <NewUserSheet {...defaultProps} isVisible={false} />,
    );
    expect(queryByTestId(NewUserSheetSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders title, body and buttons when visible', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <NewUserSheet {...defaultProps} yesLabel="Turn on notifications" />,
    );
    expect(getByTestId(NewUserSheetSelectorsIDs.TITLE)).toBeOnTheScreen();
    expect(getByTestId(NewUserSheetSelectorsIDs.BODY)).toBeOnTheScreen();
    expect(getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES)).toBeOnTheScreen();
    expect(
      getByTestId(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW),
    ).toBeOnTheScreen();
    expect(getByText('Turn on notifications')).toBeOnTheScreen();
  });

  it('renders custom notification-preview content', () => {
    const { getByText } = renderWithProvider(
      <NewUserSheet
        {...defaultProps}
        previewTitle="Transaction request"
        previewMessage="Your agent needs approval on a new limit."
        previewTimestamp="now"
      />,
    );

    expect(getByText('Transaction request')).toBeOnTheScreen();
    expect(
      getByText('Your agent needs approval on a new limit.'),
    ).toBeOnTheScreen();
    expect(getByText('now')).toBeOnTheScreen();
  });

  it('closes when the close button is pressed', () => {
    const { getAllByRole } = renderWithProvider(
      <NewUserSheet {...defaultProps} />,
    );

    fireEvent.press(getAllByRole('button')[0]);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet before calling onYes when Yes is pressed', () => {
    const mockOnYes = jest.fn();
    const { getByTestId } = renderWithProvider(
      <NewUserSheet {...defaultProps} onYes={mockOnYes} />,
    );
    fireEvent.press(getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES));
    expect(mockOnYes).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet.mock.invocationCallOrder[0]).toBeLessThan(
      mockOnYes.mock.invocationCallOrder[0],
    );
  });

  it('calls onNotNow when Not now is pressed', () => {
    const mockOnNotNow = jest.fn();
    const { getByTestId } = renderWithProvider(
      <NewUserSheet {...defaultProps} onNotNow={mockOnNotNow} />,
    );
    fireEvent.press(getByTestId(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW));
    expect(mockOnNotNow).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet.mock.invocationCallOrder[0]).toBeLessThan(
      mockOnNotNow.mock.invocationCallOrder[0],
    );
  });

  it('records Yes before closing and defers permission work until the close completes', () => {
    const onAnswered = jest.fn();
    const onYes = jest.fn();
    mockOnCloseBottomSheet.mockImplementationOnce(() => undefined);
    const { getByTestId } = renderWithProvider(
      <NewUserSheet
        {...defaultProps}
        onUserAnswered={onAnswered}
        onYes={onYes}
      />,
    );

    fireEvent.press(getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES));

    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onAnswered.mock.invocationCallOrder[0]).toBeLessThan(
      mockOnCloseBottomSheet.mock.invocationCallOrder[0],
    );
    expect(onYes).not.toHaveBeenCalled();
    mockOnCloseBottomSheet.mock.calls[0][0]?.();
    expect(onYes).toHaveBeenCalledTimes(1);
  });
});

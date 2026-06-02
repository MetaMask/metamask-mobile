import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NewUserSheet from './NewUserSheet';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { NewUserSheetSelectorsIDs } from './NewUserSheet.testIds';

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockReact = jest.requireActual('react');
    const MockBottomSheet = MockReact.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children }: any, ref: any) => {
        MockReact.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return children;
      },
    );
    MockBottomSheet.displayName = 'MockBottomSheet';
    return { __esModule: true, default: MockBottomSheet };
  },
);

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
    const { getByText, getByTestId } = renderWithProvider(
      <NewUserSheet {...defaultProps} />,
    );
    expect(
      getByText(strings('notifications.push_onboarding.new_user.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('notifications.push_onboarding.new_user.body')),
    ).toBeOnTheScreen();
    expect(getByTestId(NewUserSheetSelectorsIDs.BUTTON_YES)).toBeOnTheScreen();
    expect(
      getByTestId(NewUserSheetSelectorsIDs.BUTTON_NOT_NOW),
    ).toBeOnTheScreen();
  });

  it('renders a single preview notification card', () => {
    const { getByText, queryByText } = renderWithProvider(
      <NewUserSheet {...defaultProps} />,
    );
    expect(
      getByText(
        strings('notifications.push_onboarding.new_user.preview_card_1.title'),
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Received 0.25 ETH')).toBeNull();
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <NewUserSheet {...defaultProps} />,
    );
    fireEvent.press(getByTestId(NewUserSheetSelectorsIDs.CLOSE_BUTTON));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet before calling onYes when Enable notifications is pressed', () => {
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
});

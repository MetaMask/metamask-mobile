import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ExistingUserSheet from './ExistingUserSheet';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ExistingUserSheetSelectorsIDs } from './ExistingUserSheet.testIds';

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

jest.mock('@metamask/design-system-react-native', () => {
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
  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    BottomSheet: MockBottomSheet,
  };
});

describe('ExistingUserSheet', () => {
  const mockOnClose = jest.fn();
  const defaultProps = { isVisible: true, onClose: mockOnClose };

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when not visible', () => {
    const { queryByTestId } = renderWithProvider(
      <ExistingUserSheet {...defaultProps} isVisible={false} />,
    );
    expect(queryByTestId(ExistingUserSheetSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders title, body, consent card and buttons when visible', () => {
    const { getByTestId } = renderWithProvider(
      <ExistingUserSheet {...defaultProps} />,
    );
    expect(getByTestId(ExistingUserSheetSelectorsIDs.TITLE)).toBeOnTheScreen();
    expect(getByTestId(ExistingUserSheetSelectorsIDs.BODY)).toBeOnTheScreen();
    expect(
      getByTestId(ExistingUserSheetSelectorsIDs.BUTTON_CONFIRM),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW),
    ).toBeOnTheScreen();
  });

  it('closes when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <ExistingUserSheet {...defaultProps} />,
    );

    fireEvent.press(getByTestId(ExistingUserSheetSelectorsIDs.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Confirm is pressed', () => {
    const mockOnConfirm = jest.fn();
    const { getByTestId } = renderWithProvider(
      <ExistingUserSheet {...defaultProps} onConfirm={mockOnConfirm} />,
    );
    fireEvent.press(getByTestId(ExistingUserSheetSelectorsIDs.BUTTON_CONFIRM));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onNotNow when Not now is pressed', () => {
    const mockOnNotNow = jest.fn();
    const { getByTestId } = renderWithProvider(
      <ExistingUserSheet {...defaultProps} onNotNow={mockOnNotNow} />,
    );
    fireEvent.press(getByTestId(ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW));
    expect(mockOnNotNow).toHaveBeenCalledTimes(1);
  });
});

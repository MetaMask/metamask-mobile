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

jest.mock('@react-native-masked-view/masked-view', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockMaskedView = ({ children }: any) => children;
  MockMaskedView.displayName = 'MaskedView';
  return { __esModule: true, default: MockMaskedView };
});

jest.mock('react-native-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockLinearGradient = ({ children }: any) => children;
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

  it('renders both preview notification cards', () => {
    const { getByText } = renderWithProvider(
      <NewUserSheet {...defaultProps} />,
    );
    expect(
      getByText(
        strings('notifications.push_onboarding.new_user.preview_card_1.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('notifications.push_onboarding.new_user.preview_card_2.title'),
      ),
    ).toBeOnTheScreen();
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
});

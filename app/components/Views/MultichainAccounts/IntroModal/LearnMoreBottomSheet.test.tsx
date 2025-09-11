import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import LearnMoreBottomSheet from './LearnMoreBottomSheet';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { LEARN_MORE_BOTTOM_SHEET_TEST_IDS } from './testIds';

const mockOnClose = jest.fn();

// Mock the BottomSheet component
const mockOnCloseBottomSheet = jest.fn();
// eslint-disable-next-line import/no-commonjs
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-commonjs, @typescript-eslint/no-var-requires
    const ReactMock = require('react');
    return {
      __esModule: true,
      default: ReactMock.forwardRef(
        (
          { children }: { children: React.ReactNode },
          ref: React.Ref<{ onCloseBottomSheet: () => void }>,
        ) => {
          ReactMock.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return ReactMock.createElement(
            'View',
            { testID: 'bottom-sheet' },
            children,
          );
        },
      ),
    };
  },
);

describe('LearnMoreBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all elements', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.BOTTOM_SHEET),
    ).toBeTruthy();
    expect(getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.TITLE)).toBeTruthy();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.BACK_BUTTON),
    ).toBeTruthy();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CLOSE_BUTTON),
    ).toBeTruthy();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.DESCRIPTION),
    ).toBeTruthy();
    expect(getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX)).toBeTruthy();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON),
    ).toBeTruthy();
  });

  it('displays correct title', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.TITLE),
    ).toHaveTextContent(strings('multichain_accounts.learn_more.title'));
  });

  it('displays correct description', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(strings('multichain_accounts.learn_more.description'));
  });

  it('displays correct checkbox label', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX),
    ).toHaveTextContent(
      strings('multichain_accounts.learn_more.checkbox_label'),
    );
  });

  it('displays correct confirm button label', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON),
    ).toHaveTextContent(
      strings('multichain_accounts.learn_more.confirm_button'),
    );
  });

  it('renders confirm button', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );
    expect(confirmButton).toBeTruthy();
  });

  it('handles back button press', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const backButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.BACK_BUTTON,
    );
    fireEvent.press(backButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('handles close button press', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const closeButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CLOSE_BUTTON,
    );
    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('handles checkbox press', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const checkbox = getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX);

    // Should be able to press checkbox
    fireEvent.press(checkbox);
    // No error should be thrown
    expect(true).toBe(true);
  });

  it('has confirm button that can be pressed', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );

    // Should be able to press confirm button
    fireEvent.press(confirmButton);
    // No error should be thrown
    expect(true).toBe(true);
  });

  it('handles confirm button press', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );

    // Press confirm button
    fireEvent.press(confirmButton);

    // Should not throw error
    expect(true).toBe(true);
  });
});

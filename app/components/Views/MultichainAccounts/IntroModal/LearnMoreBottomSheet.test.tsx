import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import LearnMoreBottomSheet from './LearnMoreBottomSheet';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { LEARN_MORE_BOTTOM_SHEET_TEST_IDS } from './testIds';

const mockOnClose = jest.fn();
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};
const mockDispatch = jest.fn();

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

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => mockNavigation,
    useTheme: () => ({}),
  };
});

// Mock Redux hooks
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

describe('LearnMoreBottomSheet', () => {
  const { useSelector } = jest.requireMock('react-redux');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useSelector to return basic functionality disabled by default
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        settings: {
          basicFunctionalityEnabled: false,
        },
      };
      return selector(mockState);
    });
  });

  it('renders correctly with all elements', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.BOTTOM_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
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
    expect(confirmButton).toBeOnTheScreen();
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

  it('handles checkbox press and toggles state', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const checkbox = getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX);
    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );

    // Initially checkbox should be unchecked and confirm button disabled
    expect(confirmButton).toHaveProp('disabled', true);

    // Press checkbox to check it
    fireEvent.press(checkbox);

    // Confirm button should now be enabled
    expect(confirmButton).toHaveProp('disabled', false);
  });

  it('handles confirm button press when checkbox is checked', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const checkbox = getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX);
    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );

    // First check the checkbox
    fireEvent.press(checkbox);

    // Then press confirm button
    fireEvent.press(confirmButton);

    // Should call navigation.goBack twice (close bottom sheet and modal)
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(2);
  });

  it('does not navigate when confirm button pressed without checkbox checked', () => {
    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );

    // Press confirm button without checking checkbox
    fireEvent.press(confirmButton);

    // Should not call navigation methods
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to basic functionality when enabled and checkbox is checked', () => {
    // Mock useSelector to return basic functionality enabled
    useSelector.mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        settings: {
          basicFunctionalityEnabled: true,
        },
      };
      return selector(mockState);
    });

    const { getByTestId } = renderWithProvider(
      <LearnMoreBottomSheet onClose={mockOnClose} />,
    );

    const checkbox = getByTestId(LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CHECKBOX);
    const confirmButton = getByTestId(
      LEARN_MORE_BOTTOM_SHEET_TEST_IDS.CONFIRM_BUTTON,
    );

    // Check the checkbox
    fireEvent.press(checkbox);

    // Press confirm button
    fireEvent.press(confirmButton);

    // Should call navigation.goBack twice and navigate to basic functionality
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(2);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'BasicFunctionality',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_MULTICHAIN_ACCOUNTS_INTRO_MODAL_SEEN',
        payload: { seen: true },
      }),
    );
  });
});

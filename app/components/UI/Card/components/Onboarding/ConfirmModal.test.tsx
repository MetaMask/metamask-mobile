import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmModal from './ConfirmModal';
import { useParams } from '../../../../../util/navigation/navUtils';
import { IconName } from '@metamask/design-system-react-native';

// Mock dependencies
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

const mockStrings = jest.fn((key: string) => `mocked_${key}`);
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

// Mock BottomSheet with ref support - the mock calls callback immediately
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  if (callback) {
    callback();
  }
});

// Store the onClose prop passed to BottomSheet
let capturedOnCloseProp: (() => void) | undefined;
const getCapturedOnCloseProp = () => capturedOnCloseProp;
const setCapturedOnCloseProp = (fn: (() => void) | undefined) => {
  capturedOnCloseProp = fn;
};

// Store reference for the mock to use (hoisting workaround)
const getMockOnCloseBottomSheet = () => mockOnCloseBottomSheet;

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return React.forwardRef(
      (
        {
          children,
          testID,
          onClose,
        }: {
          children: React.ReactNode;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: (callback?: () => void) => void }>,
      ) => {
        // Capture onClose prop for testing
        React.useEffect(() => {
          setCapturedOnCloseProp(onClose);
        }, [onClose]);

        React.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            // Get the mock function at runtime to avoid hoisting issues
            const mockFn = getMockOnCloseBottomSheet();
            mockFn(callback);
          },
        }));
        return React.createElement(
          View,
          { testID: testID || 'bottom-sheet' },
          children,
        );
      },
    );
  },
);

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => React.createElement(Text, { testID }, children),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    Box: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => React.createElement(View, { testID }, children),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Column: 'column' },
    BoxJustifyContent: { Center: 'center' },
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress: () => void;
      testID?: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID },
        React.createElement(Text, null, 'Close'),
      ),
    Icon: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID }),
    IconColor: { IconDefault: 'default' },
    IconName: {
      Close: 'Close',
      UserCheck: 'UserCheck',
      Info: 'Info',
    },
    IconSize: { Xl: 'Xl' },
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      onPress: () => void;
      testID?: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: testID || 'confirm-button' },
        React.createElement(Text, null, children),
      ),
    ButtonVariant: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

interface MockConfirmModalParams {
  title: string;
  description: string;
  icon: IconName;
  confirmAction: {
    label: string;
    onPress: jest.Mock;
    variant?: string;
  };
  onClose?: jest.Mock;
}

const createMockParams = (
  overrides: Partial<MockConfirmModalParams> = {},
): MockConfirmModalParams => ({
  title: 'Test Title',
  description: 'Test Description',
  icon: IconName.UserCheck,
  confirmAction: {
    label: 'Confirm',
    onPress: jest.fn(),
  },
  ...overrides,
});

describe('ConfirmModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrings.mockClear();
    mockUseParams.mockReturnValue(createMockParams());
    setCapturedOnCloseProp(undefined);
    // Restore mock implementation since jest.resetAllMocks() clears it
    mockOnCloseBottomSheet.mockImplementation((callback?: () => void) => {
      if (callback) {
        callback();
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal with all elements', () => {
      const { getByTestId } = render(<ConfirmModal />);

      expect(getByTestId('confirm-modal')).toBeOnTheScreen();
      expect(getByTestId('confirm-modal-icon')).toBeOnTheScreen();
      expect(getByTestId('confirm-modal-title')).toBeOnTheScreen();
      expect(getByTestId('confirm-modal-description')).toBeOnTheScreen();
      expect(getByTestId('confirm-modal-actions')).toBeOnTheScreen();
      expect(getByTestId('confirm-modal-close-button')).toBeOnTheScreen();
    });

    it('displays the title from params', () => {
      mockUseParams.mockReturnValue(
        createMockParams({ title: 'Custom Title' }),
      );

      const { getByTestId } = render(<ConfirmModal />);

      expect(getByTestId('confirm-modal-title').props.children).toBe(
        'Custom Title',
      );
    });

    it('displays the description from params', () => {
      mockUseParams.mockReturnValue(
        createMockParams({ description: 'Custom Description' }),
      );

      const { getByTestId } = render(<ConfirmModal />);

      expect(getByTestId('confirm-modal-description').props.children).toBe(
        'Custom Description',
      );
    });

    it('displays custom button label from params', () => {
      const mockOnPress = jest.fn();
      mockUseParams.mockReturnValue(
        createMockParams({
          confirmAction: {
            label: 'Custom Button Label',
            onPress: mockOnPress,
          },
        }),
      );

      const { getByText } = render(<ConfirmModal />);

      expect(getByText('Custom Button Label')).toBeOnTheScreen();
    });

    it('uses default button label when label is empty', () => {
      mockUseParams.mockReturnValue(
        createMockParams({
          confirmAction: {
            label: '',
            onPress: jest.fn(),
          },
        }),
      );

      render(<ConfirmModal />);

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_onboarding.confirm_button',
      );
    });
  });

  describe('User Interactions', () => {
    it('calls confirmAction.onPress when confirm button is pressed', () => {
      const mockOnPress = jest.fn();
      mockUseParams.mockReturnValue(
        createMockParams({
          confirmAction: {
            label: 'Confirm',
            onPress: mockOnPress,
          },
        }),
      );

      const { getByTestId } = render(<ConfirmModal />);
      const confirmButton = getByTestId('confirm-button');

      fireEvent.press(confirmButton);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('closes the bottom sheet when close button is pressed', () => {
      const { getByTestId } = render(<ConfirmModal />);
      const closeButton = getByTestId('confirm-modal-close-button');

      fireEvent.press(closeButton);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('closes bottom sheet without callback when close button is pressed', () => {
      const mockOnClose = jest.fn();
      mockUseParams.mockReturnValue(
        createMockParams({
          onClose: mockOnClose,
        }),
      );

      const { getByTestId } = render(<ConfirmModal />);
      const closeButton = getByTestId('confirm-modal-close-button');

      fireEvent.press(closeButton);

      // handleCancel should close without passing callback (onClose is handled by BottomSheet prop)
      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(undefined);
    });

    it('passes onClose callback to BottomSheet component', () => {
      const mockOnClose = jest.fn();
      mockUseParams.mockReturnValue(
        createMockParams({
          onClose: mockOnClose,
        }),
      );

      render(<ConfirmModal />);

      // Verify onClose prop was passed to BottomSheet
      expect(getCapturedOnCloseProp()).toBe(mockOnClose);
    });

    it('does not pass onClose to BottomSheet when not provided', () => {
      mockUseParams.mockReturnValue(createMockParams());

      render(<ConfirmModal />);

      expect(getCapturedOnCloseProp()).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('renders with minimal params', () => {
      mockUseParams.mockReturnValue({
        title: '',
        description: '',
        icon: IconName.Info,
        confirmAction: {
          label: '',
          onPress: jest.fn(),
        },
      });

      const { getByTestId } = render(<ConfirmModal />);

      expect(getByTestId('confirm-modal')).toBeOnTheScreen();
    });

    it('handles confirmAction with custom variant', () => {
      const mockOnPress = jest.fn();
      mockUseParams.mockReturnValue(
        createMockParams({
          confirmAction: {
            label: 'Secondary Action',
            onPress: mockOnPress,
            variant: 'Secondary',
          },
        }),
      );

      const { getByTestId } = render(<ConfirmModal />);

      expect(getByTestId('confirm-button')).toBeOnTheScreen();
    });
  });
});

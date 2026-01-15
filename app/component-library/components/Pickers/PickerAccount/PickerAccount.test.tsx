// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import PickerAccount from './PickerAccount';
import { SAMPLE_PICKERACCOUNT_PROPS } from './PickerAccount.constants';
import { WalletViewSelectorsIDs } from '../../../../components/Views/Wallet/WalletView.testIds';

describe('PickerAccount', () => {
  const mockOnPress = jest.fn();
  const mockOnPressIn = jest.fn();
  const mockOnPressOut = jest.fn();

  const defaultProps = {
    accountName: SAMPLE_PICKERACCOUNT_PROPS.accountName,
    onPress: mockOnPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with required props', () => {
      const { getByText, getByTestId } = render(
        <PickerAccount {...defaultProps} />,
      );

      // Verify account name is displayed
      expect(
        getByText(SAMPLE_PICKERACCOUNT_PROPS.accountName),
      ).toBeOnTheScreen();

      // Verify test ID is present
      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      ).toBeOnTheScreen();
    });

    it('renders with custom account name', () => {
      const customAccountName = 'My Custom Account';
      const { getByText } = render(
        <PickerAccount {...defaultProps} accountName={customAccountName} />,
      );

      expect(getByText(customAccountName)).toBeOnTheScreen();
    });

    it('should render correctly with snapshot', () => {
      const { toJSON } = render(<PickerAccount {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Press Interactions', () => {
    it('calls onPress when tapped', () => {
      const { getByTestId } = render(<PickerAccount {...defaultProps} />);

      const accountPicker = getByTestId(
        WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
      ).parent?.parent;
      if (accountPicker) {
        fireEvent.press(accountPicker);
      }

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPressIn when press starts', () => {
      const { getByTestId } = render(
        <PickerAccount {...defaultProps} onPressIn={mockOnPressIn} />,
      );

      const accountPicker = getByTestId(
        WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
      ).parent?.parent;
      if (accountPicker) {
        fireEvent(accountPicker, 'pressIn');
      }

      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('calls onPressOut when press ends', () => {
      const { getByTestId } = render(
        <PickerAccount {...defaultProps} onPressOut={mockOnPressOut} />,
      );

      const accountPicker = getByTestId(
        WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
      ).parent?.parent;
      if (accountPicker) {
        fireEvent(accountPicker, 'pressOut');
      }

      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });

    it('handles press sequence correctly', () => {
      const { getByTestId } = render(
        <PickerAccount
          {...defaultProps}
          onPressIn={mockOnPressIn}
          onPressOut={mockOnPressOut}
        />,
      );

      const accountPicker = getByTestId(
        WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
      ).parent?.parent;

      // Simulate press sequence
      if (accountPicker) {
        fireEvent(accountPicker, 'pressIn');
        fireEvent.press(accountPicker);
        fireEvent(accountPicker, 'pressOut');
      }

      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props Forwarding', () => {
    it('forwards hitSlop prop to PickerBase', () => {
      const customHitSlop = { top: 10, bottom: 10, left: 15, right: 15 };
      const { toJSON } = render(
        <PickerAccount {...defaultProps} hitSlop={customHitSlop} />,
      );

      // Verify through snapshot that hitSlop is applied
      expect(toJSON()).toMatchSnapshot();
    });

    it('forwards style prop', () => {
      const customStyle = { marginTop: 20 };
      const { toJSON } = render(
        <PickerAccount {...defaultProps} style={customStyle} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('forwards additional TouchableOpacity props', () => {
      const customTestID = 'custom-picker-test-id';
      const { getByTestId } = render(
        <PickerAccount {...defaultProps} testID={customTestID} />,
      );

      expect(getByTestId(customTestID)).toBeOnTheScreen();
    });

    it('forwards props to PickerBase correctly', () => {
      const customAccessibilityLabel = 'Custom picker';
      const { getByLabelText } = render(
        <PickerAccount
          {...defaultProps}
          accessibilityLabel={customAccessibilityLabel}
        />,
      );

      expect(getByLabelText(customAccessibilityLabel)).toBeOnTheScreen();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref correctly', () => {
      const TestRefComponent = () => {
        const ref = React.useRef(null);
        return <PickerAccount {...defaultProps} ref={ref} />;
      };

      // Verify component renders without throwing when ref is provided
      expect(() => {
        render(<TestRefComponent />);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles missing onPress gracefully', () => {
      // Given a PickerAccount without onPress (should not be possible with types, but testing runtime)
      const propsWithoutOnPress = {
        accountName: defaultProps.accountName,
      };

      // When rendering
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(<PickerAccount {...(propsWithoutOnPress as any)} />);
      }).not.toThrow();
    });

    it('handles empty account name', () => {
      const { getByTestId } = render(
        <PickerAccount {...defaultProps} accountName="" />,
      );

      const textElement = getByTestId(
        WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
      );
      expect(textElement.props.children).toBe('');
    });

    it('handles undefined optional callbacks', () => {
      const { getByTestId } = render(<PickerAccount {...defaultProps} />);

      const accountPicker = getByTestId(
        WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
      ).parent?.parent;

      // Should not throw when optional callbacks are undefined
      expect(() => {
        if (accountPicker) {
          fireEvent(accountPicker, 'pressIn');
          fireEvent(accountPicker, 'pressOut');
        }
      }).not.toThrow();
    });
  });
});

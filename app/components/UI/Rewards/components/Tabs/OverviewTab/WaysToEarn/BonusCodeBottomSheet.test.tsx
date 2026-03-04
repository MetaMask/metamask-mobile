import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BonusCodeBottomSheet from './BonusCodeBottomSheet';
import { useValidateBonusCode } from '../../../../hooks/useValidateBonusCode';
import { useApplyBonusCode } from '../../../../hooks/useApplyBonusCode';

const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockRewardsToastOptions = {
  success: (title: string) => ({ type: 'success', title }),
  error: (title: string) => ({ type: 'error', title }),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');
  const R = jest.requireActual('react');

  return {
    Box: (p: Record<string, unknown>) =>
      R.createElement(View, { testID: p.testID }, p.children),
    Text: (p: Record<string, unknown>) =>
      R.createElement(RNText, { testID: p.testID }, p.children),
    Icon: (p: Record<string, unknown>) =>
      R.createElement(View, { testID: p.testID || `icon-${p.name}` }),
    Button: (p: Record<string, unknown>) =>
      R.createElement(
        TouchableOpacity,
        {
          testID: p.testID,
          onPress: p.onPress,
          disabled: p.isDisabled,
          accessibilityState: { disabled: p.isDisabled },
        },
        p.isLoading
          ? R.createElement(View, { testID: `${p.testID}-loading` })
          : R.createElement(RNText, null, p.children),
      ),
    TextVariant: { HeadingMd: 'HeadingMd', BodyMd: 'BodyMd', BodySm: 'BodySm' },
    BoxAlignItems: { Center: 'Center', Start: 'Start' },
    BoxFlexDirection: { Column: 'Column' },
    ButtonSize: { Lg: 'Lg' },
    ButtonVariant: { Primary: 'Primary' },
    IconName: { Confirmation: 'Confirmation', Error: 'Error' },
    IconSize: { Lg: 'Lg' },
    IconColor: {
      SuccessDefault: 'SuccessDefault',
      ErrorDefault: 'ErrorDefault',
    },
  };
});

jest.mock(
  '../../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const R = jest.requireActual('react');
    const Sheet = R.forwardRef((p: Record<string, unknown>, _ref: unknown) =>
      R.createElement(View, { testID: p.testID }, p.children),
    );
    Sheet.displayName = 'BottomSheet';
    return { __esModule: true, default: Sheet };
  },
);

jest.mock(
  '../../../../../../../component-library/components/Form/TextField',
  () => {
    const { View, TextInput } = jest.requireActual('react-native');
    const R = jest.requireActual('react');
    return {
      __esModule: true,
      default: (p: Record<string, unknown>) =>
        R.createElement(
          View,
          { testID: p.testID },
          R.createElement(TextInput, {
            testID: `${p.testID}-input`,
            value: p.value,
            onChangeText: p.onChangeText,
            editable: !p.isDisabled,
            placeholder: p.placeholder,
          }),
          p.endAccessory &&
            R.createElement(
              View,
              { testID: `${p.testID}-end-accessory` },
              p.endAccessory,
            ),
        ),
    };
  },
);

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../hooks/useValidateBonusCode', () => ({
  ...jest.requireActual('../../../../hooks/useValidateBonusCode'),
  useValidateBonusCode: jest.fn(),
}));

jest.mock('../../../../hooks/useApplyBonusCode', () => ({
  useApplyBonusCode: jest.fn(),
}));

jest.mock('../../../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: mockRewardsToastOptions,
  }),
}));

jest.mock('../../../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { icon: { default: '#000000' } } }),
}));

const mockUseValidateBonusCode = useValidateBonusCode as jest.MockedFunction<
  typeof useValidateBonusCode
>;
const mockUseApplyBonusCode = useApplyBonusCode as jest.MockedFunction<
  typeof useApplyBonusCode
>;

describe('BonusCodeBottomSheet', () => {
  const mockApplyBonusCode = jest.fn();
  const mockClearApplyBonusCodeError = jest.fn();
  const mockSetBonusCode = jest.fn();

  const defaultRoute = {
    params: {
      title: 'Bonus Code',
      description: 'Enter your bonus code to claim points.',
      ctaLabel: 'Submit',
    },
  };

  const defaultValidateReturn = {
    bonusCode: '',
    setBonusCode: mockSetBonusCode,
    isValidating: false,
    isValid: false,
    isUnknownError: false,
    error: '',
  };

  const defaultApplyReturn = {
    applyBonusCode: mockApplyBonusCode,
    isApplyingBonusCode: false,
    applyBonusCodeError: undefined,
    clearApplyBonusCodeError: mockClearApplyBonusCodeError,
    applyBonusCodeSuccess: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseValidateBonusCode.mockReturnValue(defaultValidateReturn);
    mockUseApplyBonusCode.mockReturnValue(defaultApplyReturn);
  });

  describe('Default State', () => {
    it('renders the bottom sheet with title and description from params', () => {
      const { getByTestId, getByText } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-bottom-sheet')).toBeOnTheScreen();
      expect(getByText('Bonus Code')).toBeOnTheScreen();
      expect(
        getByText('Enter your bonus code to claim points.'),
      ).toBeOnTheScreen();
    });

    it('renders ReactNode title and description', () => {
      const customRoute = {
        params: {
          title: <></>,
          description: <></>,
          ctaLabel: 'Go',
        },
      };

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={customRoute} />,
      );

      expect(getByTestId('bonus-code-bottom-sheet')).toBeOnTheScreen();
    });

    it('renders the text input', () => {
      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-input')).toBeOnTheScreen();
    });

    it('renders submit button with ctaLabel', () => {
      const { getByTestId, getByText } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-submit-button')).toBeOnTheScreen();
      expect(getByText('Submit')).toBeOnTheScreen();
    });

    it('disables submit button when code is not valid', () => {
      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      const button = getByTestId('bonus-code-submit-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Input Handling', () => {
    it('calls setBonusCode when input text changes', () => {
      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      fireEvent.changeText(getByTestId('bonus-code-input-input'), 'ABC123');

      expect(mockSetBonusCode).toHaveBeenCalledWith('ABC123');
    });

    it('shows validation error when code is invalid and 4+ chars', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'ABCD',
        error: 'Invalid bonus code',
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-invalid-code')).toBeOnTheScreen();
    });

    it('does not show validation error when code is less than 4 chars', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'ABC',
        error: 'some error',
      });

      const { queryByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(queryByTestId('bonus-code-invalid-code')).toBeNull();
    });

    it('shows loading indicator in input when validating', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValidating: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-input-end-accessory')).toBeOnTheScreen();
    });

    it('shows success icon in input when code is valid', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-input-end-accessory')).toBeOnTheScreen();
    });

    it('does not show error icon when isUnknownError is true', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isUnknownError: true,
      });

      const { queryByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(queryByTestId('bonus-code-input-end-accessory')).toBeNull();
    });
  });

  describe('Valid Code State', () => {
    it('enables submit button when code is valid', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      const button = getByTestId('bonus-code-submit-button');
      expect(button.props.accessibilityState.disabled).toBe(false);
    });

    it('calls applyBonusCode when submit is pressed', () => {
      mockApplyBonusCode.mockResolvedValue(undefined);
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      fireEvent.press(getByTestId('bonus-code-submit-button'));

      expect(mockClearApplyBonusCodeError).toHaveBeenCalled();
      expect(mockApplyBonusCode).toHaveBeenCalledWith('BNS123');
    });

    it('shows success toast and navigates back after successful submit', async () => {
      mockApplyBonusCode.mockResolvedValue(undefined);
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      await fireEvent.press(getByTestId('bonus-code-submit-button'));
      await new Promise(process.nextTick);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Applying State', () => {
    it('disables submit button while applying', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });
      mockUseApplyBonusCode.mockReturnValue({
        ...defaultApplyReturn,
        isApplyingBonusCode: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      const button = getByTestId('bonus-code-submit-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('shows loading state on submit button while applying', () => {
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });
      mockUseApplyBonusCode.mockReturnValue({
        ...defaultApplyReturn,
        isApplyingBonusCode: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-submit-button-loading')).toBeOnTheScreen();
    });
  });

  describe('Apply Error State', () => {
    it('renders apply error message', () => {
      mockUseApplyBonusCode.mockReturnValue({
        ...defaultApplyReturn,
        applyBonusCodeError: 'Failed to apply',
      });

      const { getByTestId, getByText } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bonus-code-apply-error')).toBeOnTheScreen();
      expect(getByText('Failed to apply')).toBeOnTheScreen();
    });

    it('does not render apply error when none exists', () => {
      const { queryByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      expect(queryByTestId('bonus-code-apply-error')).toBeNull();
    });

    it('does not navigate back when submit fails', async () => {
      mockApplyBonusCode.mockRejectedValue(new Error('Apply failed'));
      mockUseValidateBonusCode.mockReturnValue({
        ...defaultValidateReturn,
        bonusCode: 'BNS123',
        isValid: true,
      });

      const { getByTestId } = render(
        <BonusCodeBottomSheet route={defaultRoute} />,
      );

      await fireEvent.press(getByTestId('bonus-code-submit-button'));
      await new Promise(process.nextTick);

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});

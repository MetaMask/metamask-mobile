import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferredByCodeSection from './ReferredByCodeSection';
import { useReferralDetails } from '../../hooks/useReferralDetails';
import { useValidateReferralCode } from '../../hooks/useValidateReferralCode';
import { useApplyReferralCode } from '../../hooks/useApplyReferralCode';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText, View } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, { testID, ...props }, children),
    Icon: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(View, {
        testID: testID || `icon-${name}`,
        accessibilityLabel: name,
        ...props,
      }),
    TextVariant: {
      BodySm: 'BodySm',
      HeadingSm: 'HeadingSm',
    },
    IconName: {
      Confirmation: 'Confirmation',
      Error: 'Error',
    },
    IconSize: {
      Lg: 'Lg',
    },
    IconColor: {
      SuccessDefault: 'SuccessDefault',
      ErrorDefault: 'ErrorDefault',
    },
  };
});

jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const ReactActual = jest.requireActual('react');
  const { TextInput, View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      testID,
      value,
      onChangeText,
      isDisabled,
      placeholder,
      endAccessory,
      isError,
      ...props
    }: {
      testID?: string;
      value?: string;
      onChangeText?: (text: string) => void;
      isDisabled?: boolean;
      placeholder?: string;
      endAccessory?: React.ReactNode;
      isError?: boolean;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(TextInput, {
          testID: `${testID}-input`,
          value,
          onChangeText,
          editable: !isDisabled,
          placeholder,
          accessibilityState: { disabled: isDisabled },
          ...props,
        }),
        endAccessory &&
          ReactActual.createElement(
            View,
            { testID: `${testID}-end-accessory` },
            endAccessory,
          ),
      ),
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, Text, ActivityIndicator } =
    jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      testID,
      label,
      onPress,
      isDisabled,
      loading,
    }: {
      testID?: string;
      label: string;
      onPress: () => void;
      isDisabled?: boolean;
      loading?: boolean;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID,
          onPress,
          disabled: isDisabled,
          accessibilityState: { disabled: isDisabled },
        },
        loading
          ? ReactActual.createElement(ActivityIndicator, {
              testID: `${testID}-loading`,
            })
          : ReactActual.createElement(Text, {}, label),
      ),
    ButtonVariants: {
      Primary: 'primary',
    },
  };
});

jest.mock('../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    Skeleton: ({ height, width }: { height: number; width: number | string }) =>
      ReactActual.createElement(View, {
        testID: 'skeleton',
        style: { height, width },
      }),
  };
});

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      testID,
      title,
      description,
      onConfirm,
      confirmButtonLabel,
    }: {
      testID?: string;
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, { testID: `${testID}-title` }, title),
        ReactActual.createElement(
          Text,
          { testID: `${testID}-description` },
          description,
        ),
        onConfirm &&
          ReactActual.createElement(
            TouchableOpacity,
            { testID: `${testID}-retry-button`, onPress: onConfirm },
            ReactActual.createElement(Text, {}, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn(),
}));

jest.mock('../../hooks/useValidateReferralCode', () => ({
  useValidateReferralCode: jest.fn(),
}));

jest.mock('../../hooks/useApplyReferralCode', () => ({
  useApplyReferralCode: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { muted: '#f5f5f5' },
      border: { muted: '#e0e0e0' },
      error: { default: '#ff0000' },
    },
  })),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseReferralDetails = useReferralDetails as jest.MockedFunction<
  typeof useReferralDetails
>;
const mockUseValidateReferralCode =
  useValidateReferralCode as jest.MockedFunction<
    typeof useValidateReferralCode
  >;
const mockUseApplyReferralCode = useApplyReferralCode as jest.MockedFunction<
  typeof useApplyReferralCode
>;

describe('ReferredByCodeSection', () => {
  const mockFetchReferralDetails = jest.fn();
  const mockSetInputCode = jest.fn();
  const mockApplyReferralCode = jest.fn();

  const createMockSelectors = (overrides: {
    referredByCode?: string | null;
    isLoading?: boolean;
    referralDetailsError?: boolean;
  }) => {
    const {
      referredByCode = null,
      isLoading = false,
      referralDetailsError = false,
    } = overrides;

    return (selector: unknown) => {
      const selectorString = selector?.toString() || '';
      if (selectorString.includes('selectReferredByCode')) {
        return referredByCode;
      }
      if (selectorString.includes('selectReferralDetailsLoading')) {
        return isLoading;
      }
      if (selectorString.includes('selectReferralDetailsError')) {
        return referralDetailsError;
      }
      return undefined;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseReferralDetails.mockReturnValue({
      fetchReferralDetails: mockFetchReferralDetails,
    });

    mockUseValidateReferralCode.mockReturnValue({
      referralCode: '',
      setReferralCode: mockSetInputCode,
      validateCode: jest.fn().mockResolvedValue(''),
      isValidating: false,
      isValid: false,
      isUnknownError: false,
    });

    mockUseApplyReferralCode.mockReturnValue({
      applyReferralCode: mockApplyReferralCode,
      isApplyingReferralCode: false,
      applyReferralCodeError: undefined,
      clearApplyReferralCodeError: jest.fn(),
    });

    mockUseSelector.mockImplementation(
      createMockSelectors({ referredByCode: null, isLoading: false }),
    );
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      mockUseSelector.mockImplementation(
        createMockSelectors({ isLoading: true }),
      );

      const { getByTestId, getAllByTestId } = render(<ReferredByCodeSection />);

      expect(getByTestId('referred-by-code-section-loading')).toBeOnTheScreen();
      expect(getAllByTestId('skeleton')).toHaveLength(3);
    });

    it('does not render main content when loading', () => {
      mockUseSelector.mockImplementation(
        createMockSelectors({ isLoading: true }),
      );

      const { queryByTestId } = render(<ReferredByCodeSection />);

      expect(queryByTestId('referred-by-code-section')).toBeNull();
      expect(queryByTestId('referred-by-code-input')).toBeNull();
    });
  });

  describe('Error State', () => {
    it('renders error banner when referralDetailsError is true and no referredByCode', () => {
      mockUseSelector.mockImplementation(
        createMockSelectors({
          referralDetailsError: true,
          referredByCode: null,
        }),
      );

      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(getByTestId('referred-by-code-section-error')).toBeOnTheScreen();
      expect(getByTestId('referred-by-code-error-banner')).toBeOnTheScreen();
    });

    it('renders error banner title and description', () => {
      mockUseSelector.mockImplementation(
        createMockSelectors({
          referralDetailsError: true,
          referredByCode: null,
        }),
      );

      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(
        getByTestId('referred-by-code-error-banner-title'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('referred-by-code-error-banner-description'),
      ).toBeOnTheScreen();
    });

    it('calls fetchReferralDetails when retry button is pressed', () => {
      mockUseSelector.mockImplementation(
        createMockSelectors({
          referralDetailsError: true,
          referredByCode: null,
        }),
      );

      const { getByTestId } = render(<ReferredByCodeSection />);

      const retryButton = getByTestId(
        'referred-by-code-error-banner-retry-button',
      );
      fireEvent.press(retryButton);

      expect(mockFetchReferralDetails).toHaveBeenCalledTimes(1);
    });

    it('does not render error banner when referredByCode exists even with error', () => {
      mockUseSelector.mockImplementation(
        createMockSelectors({
          referralDetailsError: true,
          referredByCode: 'ABC123',
        }),
      );

      const { queryByTestId, getByTestId } = render(<ReferredByCodeSection />);

      expect(queryByTestId('referred-by-code-section-error')).toBeNull();
      expect(getByTestId('referred-by-code-section')).toBeOnTheScreen();
    });
  });

  describe('Success State with referredByCode', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation(
        createMockSelectors({ referredByCode: 'EXISTINGCODE' }),
      );
    });

    it('renders main section with correct testID', () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(getByTestId('referred-by-code-section')).toBeOnTheScreen();
    });

    it('renders linked description when referredByCode exists', () => {
      const { getByText } = render(<ReferredByCodeSection />);

      expect(
        getByText('rewards.referred_by_code.description_linked'),
      ).toBeOnTheScreen();
    });

    it('displays the existing referral code in input', () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      const input = getByTestId('referred-by-code-input-input');
      expect(input.props.value).toBe('EXISTINGCODE');
    });

    it('disables the input when referredByCode exists', () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      const input = getByTestId('referred-by-code-input-input');
      expect(input.props.editable).toBe(false);
    });

    it('does not render apply button when referredByCode exists', () => {
      const { queryByTestId } = render(<ReferredByCodeSection />);

      expect(queryByTestId('apply-referral-code-button')).toBeNull();
    });
  });

  describe('Success State without referredByCode', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation(
        createMockSelectors({ referredByCode: null }),
      );
    });

    it('renders not linked description when no referredByCode', () => {
      const { getByText } = render(<ReferredByCodeSection />);

      expect(
        getByText('rewards.referred_by_code.description_not_linked'),
      ).toBeOnTheScreen();
    });

    it('renders editable input when no referredByCode', () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      const input = getByTestId('referred-by-code-input-input');
      expect(input.props.editable).toBe(true);
    });

    it('renders apply button when no referredByCode', () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(getByTestId('apply-referral-code-button')).toBeOnTheScreen();
    });

    it('calls setInputCode when input text changes', () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      const input = getByTestId('referred-by-code-input-input');
      fireEvent.changeText(input, 'NEWCODE');

      expect(mockSetInputCode).toHaveBeenCalledWith('NEWCODE');
    });
  });

  describe('Input Validation States', () => {
    it('renders loading indicator when validating', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'ABC123',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: true,
        isValid: false,
        isUnknownError: false,
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(
        getByTestId('referred-by-code-input-end-accessory'),
      ).toBeOnTheScreen();
    });

    it('renders success icon when code is valid', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID1',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      const endAccessory = getByTestId('referred-by-code-input-end-accessory');
      expect(endAccessory).toBeOnTheScreen();
    });

    it('renders error icon when code is 6+ chars and invalid', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'INVALID',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      const endAccessory = getByTestId('referred-by-code-input-end-accessory');
      expect(endAccessory).toBeOnTheScreen();
    });

    it('renders invalid code error text when code is invalid', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'BADCODE',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(getByTestId('referred-by-code-invalid-code')).toBeOnTheScreen();
    });

    it('does not render error text when isUnknownError is true', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'BADCODE',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: false,
        isUnknownError: true,
      });

      const { queryByTestId } = render(<ReferredByCodeSection />);

      expect(queryByTestId('referred-by-code-invalid-code')).toBeNull();
    });

    it('does not render error text when code is less than 6 chars', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'ABC',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
      });

      const { queryByTestId } = render(<ReferredByCodeSection />);

      expect(queryByTestId('referred-by-code-invalid-code')).toBeNull();
    });
  });

  describe('Apply Button State', () => {
    it('disables apply button when code is not valid', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'TEST',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: false,
        isUnknownError: false,
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      const button = getByTestId('apply-referral-code-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('disables apply button when isApplyingReferralCode is true', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID1',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });
      mockUseApplyReferralCode.mockReturnValue({
        applyReferralCode: mockApplyReferralCode,
        isApplyingReferralCode: true,
        applyReferralCodeError: undefined,
        clearApplyReferralCodeError: jest.fn(),
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      const button = getByTestId('apply-referral-code-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables apply button when code is valid and not applying', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID1',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });
      mockUseApplyReferralCode.mockReturnValue({
        applyReferralCode: mockApplyReferralCode,
        isApplyingReferralCode: false,
        applyReferralCodeError: undefined,
        clearApplyReferralCodeError: jest.fn(),
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      const button = getByTestId('apply-referral-code-button');
      expect(button.props.accessibilityState?.disabled).toBe(false);
    });

    it('shows loading indicator when applying referral code', () => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID1',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });
      mockUseApplyReferralCode.mockReturnValue({
        applyReferralCode: mockApplyReferralCode,
        isApplyingReferralCode: true,
        applyReferralCodeError: undefined,
        clearApplyReferralCodeError: jest.fn(),
      });

      const { getByTestId } = render(<ReferredByCodeSection />);

      expect(
        getByTestId('apply-referral-code-button-loading'),
      ).toBeOnTheScreen();
    });
  });

  describe('Apply Button Interaction', () => {
    beforeEach(() => {
      mockUseValidateReferralCode.mockReturnValue({
        referralCode: 'VALID1',
        setReferralCode: mockSetInputCode,
        validateCode: jest.fn().mockResolvedValue(''),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });
      mockApplyReferralCode.mockResolvedValue(undefined);
      mockFetchReferralDetails.mockResolvedValue(undefined);
    });

    it('calls applyReferralCode with input code when button is pressed', async () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      const button = getByTestId('apply-referral-code-button');

      await act(async () => {
        fireEvent.press(button);
      });

      expect(mockApplyReferralCode).toHaveBeenCalledWith('VALID1');
    });

    it('calls fetchReferralDetails after applyReferralCode succeeds', async () => {
      const { getByTestId } = render(<ReferredByCodeSection />);

      const button = getByTestId('apply-referral-code-button');

      await act(async () => {
        fireEvent.press(button);
      });

      expect(mockApplyReferralCode).toHaveBeenCalledTimes(1);
      expect(mockFetchReferralDetails).toHaveBeenCalledTimes(1);
    });

    it('handles error when applyReferralCode fails', async () => {
      mockApplyReferralCode.mockRejectedValue(new Error('Failed to apply'));

      const { getByTestId } = render(<ReferredByCodeSection />);

      const button = getByTestId('apply-referral-code-button');

      await act(async () => {
        fireEvent.press(button);
      });

      expect(mockApplyReferralCode).toHaveBeenCalledTimes(1);
      // Error is handled by the hook, no crash expected
    });
  });

  describe('Apply Referral Code Error', () => {
    it('renders error message when applyReferralCodeError exists', () => {
      mockUseApplyReferralCode.mockReturnValue({
        applyReferralCode: mockApplyReferralCode,
        isApplyingReferralCode: false,
        applyReferralCodeError: 'Failed to apply referral code',
        clearApplyReferralCodeError: jest.fn(),
      });

      const { getByTestId, getByText } = render(<ReferredByCodeSection />);

      expect(getByTestId('apply-referral-code-error')).toBeOnTheScreen();
      expect(getByText('Failed to apply referral code')).toBeOnTheScreen();
    });

    it('does not render error message when applyReferralCodeError is undefined', () => {
      mockUseApplyReferralCode.mockReturnValue({
        applyReferralCode: mockApplyReferralCode,
        isApplyingReferralCode: false,
        applyReferralCodeError: undefined,
        clearApplyReferralCodeError: jest.fn(),
      });

      const { queryByTestId } = render(<ReferredByCodeSection />);

      expect(queryByTestId('apply-referral-code-error')).toBeNull();
    });
  });
});

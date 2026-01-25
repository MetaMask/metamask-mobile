import React, { ReactNode } from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import MetalCardClaimBottomSheet from './MetalCardClaimBottomSheet';

// Mock useClaimReward hook
const mockClaimReward = jest.fn();
const mockClearClaimRewardError = jest.fn();

const mockUseClaimRewardState: {
  claimReward: jest.Mock;
  isClaimingReward: boolean;
  claimRewardError: string | undefined;
  clearClaimRewardError: jest.Mock;
} = {
  claimReward: mockClaimReward,
  isClaimingReward: false,
  claimRewardError: undefined,
  clearClaimRewardError: mockClearClaimRewardError,
};

jest.mock('../../hooks/useClaimReward', () => ({
  __esModule: true,
  default: () => mockUseClaimRewardState,
}));

// Mock useRewardsToast hook
const mockShowToast = jest.fn();
const mockSuccessToast = jest.fn().mockReturnValue({
  variant: 'icon',
  iconName: 'confirmation',
});

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: mockSuccessToast,
    },
  }),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    REWARDS_REWARD_VIEWED: 'REWARDS_REWARD_VIEWED',
    REWARDS_REWARD_CLAIMED: 'REWARDS_REWARD_CLAIMED',
  },
}));

// Mock RewardsErrorBanner
jest.mock('../RewardsErrorBanner', () => {
  const ReactMock = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, description }: { title: string; description: string }) =>
      ReactMock.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactMock.createElement(Text, { testID: 'error-title' }, title),
        ReactMock.createElement(
          Text,
          { testID: 'error-description' },
          description,
        ),
      ),
  };
});

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.metal_card_claim.title': 'Metal Card Claim',
      'rewards.metal_card_claim.description': 'Enter your details to claim.',
      'rewards.metal_card_claim.contact_info': 'Contact information',
      'rewards.metal_card_claim.email_label': 'Email',
      'rewards.metal_card_claim.telegram_label': 'Telegram (optional)',
      'rewards.metal_card_claim.telegram_placeholder': '@username',
      'rewards.metal_card_claim.submit_button': 'Submit',
      'rewards.metal_card_claim.email_validation_error': 'Invalid email',
      'rewards.unlocked_rewards.reward_claimed': 'Reward claimed!',
      'rewards.claim_reward_error.title': 'Claim Error',
    };
    return translations[key] || key;
  }),
}));

// Mock BottomSheet component
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactMock = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactMock.forwardRef(
      ({ children }: { children: ReactNode }, _ref: unknown) =>
        ReactMock.createElement(View, { testID: 'bottom-sheet' }, children),
    );
  },
);

// Mock BottomSheetHeader
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactMock = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        onClose,
      }: {
        children: ReactNode;
        onClose: () => void;
      }) =>
        ReactMock.createElement(
          View,
          { testID: 'bottom-sheet-header' },
          ReactMock.createElement(Text, null, children),
          ReactMock.createElement(TouchableOpacity, {
            testID: 'header-close-button',
            onPress: onClose,
          }),
        ),
    };
  },
);

// Mock TextField component
jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const ReactMock = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  const MockTextFieldComponent = (props: {
    placeholder?: string;
    onChangeText: (text: string) => void;
    value: string;
    isError?: boolean;
    isDisabled?: boolean;
    keyboardType?: string;
  }) =>
    ReactMock.createElement(TextInput, {
      testID:
        props.keyboardType === 'email-address'
          ? 'email-input'
          : 'telegram-input',
      placeholder: props.placeholder,
      onChangeText: props.onChangeText,
      value: props.value,
      'data-error': props.isError,
      editable: !props.isDisabled,
    });

  return {
    __esModule: true,
    default: MockTextFieldComponent,
    TextFieldSize: {
      Lg: 'lg',
    },
  };
});

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactMock = jest.requireActual('react');
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');
  return {
    ButtonVariant: {
      Primary: 'primary',
      Secondary: 'secondary',
    },
    ButtonSize: {
      Lg: 'lg',
    },
    BoxFlexDirection: {
      Column: 'column',
    },
    BoxAlignItems: {
      Start: 'start',
      Center: 'center',
    },
    BoxJustifyContent: {
      Center: 'center',
    },
    TextVariant: {
      BodyMd: 'bodyMd',
      BodySm: 'bodySm',
    },
    Box: ({ children, ...props }: { children: ReactNode }) =>
      ReactMock.createElement(View, props, children),
    Button: ({
      children,
      onPress,
      disabled,
      isLoading,
    }: {
      children: ReactNode;
      onPress: () => void;
      disabled: boolean;
      isLoading?: boolean;
    }) =>
      ReactMock.createElement(
        TouchableOpacity,
        {
          testID: 'submit-button',
          onPress,
          disabled,
          'data-loading': isLoading,
          accessibilityState: disabled ? { disabled: true } : undefined,
        },
        ReactMock.createElement(RNText, null, children),
      ),
    Text: ({ children, ...props }: { children: ReactNode }) =>
      ReactMock.createElement(RNText, props, children),
  };
});

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn().mockImplementation((...args: unknown[]) => ({ ...args })),
  }),
}));

// Mock KeyboardAwareScrollView
jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    KeyboardAwareScrollView: ({ children }: { children: ReactNode }) =>
      ReactMock.createElement(View, { testID: 'keyboard-scroll' }, children),
  };
});

// Mock validateEmail
jest.mock('../../utils/formatUtils', () => ({
  validateEmail: jest.fn((email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  ),
}));

interface TestRouteParams {
  rewardId: string;
  seasonRewardId: string;
}

const defaultRoute: { params: TestRouteParams } = {
  params: {
    rewardId: 'reward-123',
    seasonRewardId: 'season-reward-1',
  },
};

describe('MetalCardClaimBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClaimRewardState.isClaimingReward = false;
    mockUseClaimRewardState.claimRewardError = undefined;
  });

  describe('rendering', () => {
    it('renders the bottom sheet', () => {
      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders the header with title', () => {
      const { getByTestId, getByText } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
      expect(getByText('Metal Card Claim')).toBeOnTheScreen();
    });

    it('renders email and telegram input fields', () => {
      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('email-input')).toBeOnTheScreen();
      expect(getByTestId('telegram-input')).toBeOnTheScreen();
    });

    it('renders the submit button', () => {
      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('submit-button')).toBeOnTheScreen();
    });
  });

  describe('email input', () => {
    it('updates email value when typing', () => {
      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('displays validation error for email without domain', async () => {
      const { getByTestId, getByText } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'invalidemail');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(getByText('Invalid email')).toBeOnTheScreen();
    });

    it('clears validation error when editing email', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'invalid');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(getByText('Invalid email')).toBeOnTheScreen();

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(queryByText('Invalid email')).toBeNull();
    });
  });

  describe('telegram input', () => {
    it('updates telegram value when typing', () => {
      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const telegramInput = getByTestId('telegram-input');
      fireEvent.changeText(telegramInput, '@user123');

      expect(telegramInput.props.value).toBe('@user123');
    });
  });

  describe('claim reward flow', () => {
    it('calls claimReward with email when submitting', async () => {
      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockClaimReward).toHaveBeenCalledWith('reward-123', {
        data: {
          email: 'test@example.com',
        },
      });
    });

    it('includes telegram handle in claim data when provided', async () => {
      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      const telegramInput = getByTestId('telegram-input');
      fireEvent.changeText(telegramInput, '@user123');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockClaimReward).toHaveBeenCalledWith('reward-123', {
        data: {
          email: 'test@example.com',
          telegramHandle: '@user123',
        },
      });
    });

    it('closes modal and shows toast on successful claim', async () => {
      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('keeps modal open when claim fails', async () => {
      mockClaimReward.mockRejectedValue(new Error('Claim failed'));

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('loading and error states', () => {
    it('disables submit button when claiming reward', () => {
      mockUseClaimRewardState.isClaimingReward = true;

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const submitButton = getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('shows loading state when claiming reward', () => {
      mockUseClaimRewardState.isClaimingReward = true;

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const submitButton = getByTestId('submit-button');
      expect(submitButton.props['data-loading']).toBe(true);
    });

    it('displays error banner when claim fails', () => {
      mockUseClaimRewardState.claimRewardError = 'Something went wrong';

      const { getByTestId, getByText } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      expect(getByTestId('rewards-error-banner')).toBeOnTheScreen();
      expect(getByText('Something went wrong')).toBeOnTheScreen();
    });

    it('hides error banner when loading', () => {
      mockUseClaimRewardState.isClaimingReward = true;
      mockUseClaimRewardState.claimRewardError = 'Something went wrong';

      const { queryByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('disables input fields when claiming reward', () => {
      mockUseClaimRewardState.isClaimingReward = true;

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      const telegramInput = getByTestId('telegram-input');

      expect(emailInput.props.editable).toBe(false);
      expect(telegramInput.props.editable).toBe(false);
    });
  });

  describe('navigation', () => {
    it('calls goBack when header close button pressed', () => {
      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const closeButton = getByTestId('header-close-button');
      fireEvent.press(closeButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('analytics tracking', () => {
    it('tracks reward viewed event on mount', () => {
      render(<MetalCardClaimBottomSheet route={defaultRoute} />);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalled();
    });

    it('tracks reward viewed event only once on re-renders', () => {
      const { rerender } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      rerender(<MetalCardClaimBottomSheet route={defaultRoute} />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('tracks reward claimed event on successful claim', async () => {
      mockClaimReward.mockResolvedValue(undefined);

      const { getByTestId } = render(
        <MetalCardClaimBottomSheet route={defaultRoute} />,
      );

      const emailInput = getByTestId('email-input');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = getByTestId('submit-button');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      // First call is REWARD_VIEWED on mount, second is REWARD_CLAIMED
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });
  });
});

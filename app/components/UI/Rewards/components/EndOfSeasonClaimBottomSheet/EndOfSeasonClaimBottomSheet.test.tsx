import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import EndOfSeasonClaimBottomSheet from './EndOfSeasonClaimBottomSheet';
import { SeasonRewardType } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import Routes from '../../../../../constants/navigation/Routes';

// Mock selectors
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';

// Mock react-redux
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

// Mock the selectors module
jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectIconSeedAddressByAccountGroupId: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: jest.fn(),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

// Mock useAnalytics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Mock MetaMetricsEvents (still imported from useMetrics)
jest.mock('../../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    REWARDS_REWARD_VIEWED: 'REWARDS_REWARD_VIEWED',
    REWARDS_REWARD_CLAIMED: 'REWARDS_REWARD_CLAIMED',
  },
}));

// Mock useRewardsToast
const mockShowToast = jest.fn();
const mockRewardsToastOptions = {
  success: jest.fn((title: string) => ({ title, type: 'success' })),
  error: jest.fn((title: string, desc?: string) => ({
    title,
    desc,
    type: 'error',
  })),
};
jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: mockRewardsToastOptions,
  }),
}));

// Mock useClaimReward
const mockClaimReward = jest.fn();
jest.mock('../../hooks/useClaimReward', () => ({
  __esModule: true,
  default: () => ({
    claimReward: mockClaimReward,
    isClaimingReward: false,
  }),
}));

// Mock useLineaSeasonOneTokenReward
const mockLineaTokenReward = {
  lineaTokenReward: null,
  isLoading: false,
  error: false,
};
jest.mock('../../hooks/useLineaSeasonOneTokenReward', () => ({
  __esModule: true,
  default: () => mockLineaTokenReward,
}));

// Mock useTheme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        alternative: '#666666',
      },
    },
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'rewards.end_of_season_rewards.reward_details': 'Reward Details',
      'rewards.end_of_season_rewards.confirm_label_default': 'Redeem',
      'rewards.end_of_season_rewards.confirm_label_access': 'Access',
      'rewards.end_of_season_rewards.redeem_success_title': 'Success!',
      'rewards.end_of_season_rewards.redeem_failure_title': 'Failed',
      'rewards.end_of_season_rewards.redeem_failure_description':
        'Please try again',
      'rewards.end_of_season_rewards.select_account_description':
        'Select account to receive tokens',
      'rewards.metal_card_claim.email_label': 'Email',
      'rewards.metal_card_claim.email_validation_error':
        'Please enter a valid email',
      'rewards.metal_card_claim.telegram_label': 'Telegram (optional)',
      'rewards.metal_card_claim.telegram_placeholder': '@username',
      'rewards.linea_tokens.default_title': 'Claim your LINEA tokens',
      'rewards.linea_tokens.title_earned': `You earned ${params?.amount || ''} $LINEA`,
    };
    return translations[key] || key;
  }),
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    Object.assign(mockTw, {
      style: jest.fn((styles) => {
        if (Array.isArray(styles)) {
          return styles.reduce(
            (acc: object, style: object) => ({ ...acc, ...style }),
            {},
          );
        }
        return styles || {};
      }),
    });
    return mockTw;
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  const Box = ({
    children,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    testID?: string;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, { testID, ...props }, children);

  const TextComponent = ({
    children,
    onPress,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
    [key: string]: unknown;
  }) =>
    onPress
      ? ReactActual.createElement(
          TouchableOpacity,
          { onPress, testID, ...props },
          ReactActual.createElement(Text, {}, children),
        )
      : ReactActual.createElement(Text, { testID, ...props }, children);

  const Button = ({
    children,
    onPress,
    testID,
    disabled,
    isLoading,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
    disabled?: boolean;
    isLoading?: boolean;
  }) =>
    ReactActual.createElement(
      TouchableOpacity,
      {
        onPress,
        testID,
        disabled,
        accessibilityLabel: `disabled:${disabled},isLoading:${isLoading}`,
      },
      ReactActual.createElement(Text, {}, children),
    );

  const Icon = ({ name, ...props }: { name: string; [key: string]: unknown }) =>
    ReactActual.createElement(
      View,
      { testID: `icon-${name}`, ...props },
      ReactActual.createElement(Text, {}, `Icon-${name}`),
    );

  return {
    Box,
    Text: TextComponent,
    Button,
    Icon,
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
      Start: 'start',
    },
    BoxJustifyContent: {
      Center: 'center',
      Between: 'space-between',
    },
    TextVariant: {
      HeadingLg: 'HeadingLg',
      HeadingSm: 'HeadingSm',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    ButtonVariant: {
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
    ButtonSize: {
      Lg: 'Lg',
    },
    IconName: {
      ArrowDown: 'ArrowDown',
    },
    IconSize: {
      Lg: 'Lg',
    },
    IconColor: {
      IconAlternative: 'IconAlternative',
    },
  };
});

// Mock BottomSheet
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        testID,
      }: {
        children?: React.ReactNode;
        testID?: string;
      }) => ReactActual.createElement(View, { testID }, children),
    };
  },
);

// Mock BottomSheetHeader
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        onClose,
      }: {
        children?: React.ReactNode;
        onClose?: () => void;
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'bottom-sheet-header' },
          ReactActual.createElement(Text, {}, children),
          ReactActual.createElement(
            TouchableOpacity,
            { onPress: onClose, testID: 'close-button' },
            ReactActual.createElement(Text, {}, 'Close'),
          ),
        ),
    };
  },
);

// Mock TextField
jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const ReactActual = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onChangeText,
      value,
      testID,
      isError,
      isDisabled,
      placeholder,
    }: {
      onChangeText?: (text: string) => void;
      value?: string;
      testID?: string;
      isError?: boolean;
      isDisabled?: boolean;
      placeholder?: string;
    }) =>
      ReactActual.createElement(TextInput, {
        onChangeText,
        value,
        testID,
        placeholder,
        editable: !isDisabled,
        accessibilityLabel: `isError:${isError},isDisabled:${isDisabled}`,
      }),
    TextFieldSize: {
      Lg: 'Lg',
    },
  };
});

// Mock AvatarAccount
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ accountAddress }: { accountAddress?: string }) =>
        ReactActual.createElement(View, {
          testID: 'avatar-account',
          accessibilityLabel: `address:${accountAddress}`,
        }),
    };
  },
);

// Mock AvatarSize
jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: {
    Md: 'Md',
  },
}));

// Mock createAccountSelectorNavDetails
jest.mock('../../../../Views/AccountSelector', () => ({
  createAccountSelectorNavDetails: jest.fn(() => ['AccountSelector', {}]),
}));

// Mock RewardsErrorBanner
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, description }: { title: string; description: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(Text, {}, title),
        ReactActual.createElement(Text, {}, description),
      ),
  };
});

// Mock validateEmail
jest.mock('../../utils/formatUtils', () => ({
  validateEmail: jest.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }),
}));

// Mock formatAssetAmount
jest.mock('../../utils/eventDetailsUtils', () => ({
  formatAssetAmount: jest.fn((amount: string) => {
    const value = BigInt(amount) / BigInt(10 ** 18);
    return value.toString();
  }),
}));

// Mock KeyboardAwareScrollView
jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const ReactActual = jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');
  return {
    KeyboardAwareScrollView: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(ScrollView, {}, children),
  };
});

type InputFieldConfig = 'required' | 'optional' | false;

interface RouteParams {
  seasonRewardId: string;
  url?: string;
  title: string;
  description?: string;
  contactInfo?: string;
  rewardType: SeasonRewardType;
  showAccount?: boolean;
  showEmail?: InputFieldConfig;
  showTelegram?: InputFieldConfig;
  rewardId?: string;
}

describe('EndOfSeasonClaimBottomSheet', () => {
  const defaultRouteParams: RouteParams = {
    seasonRewardId: 'season-reward-1',
    title: 'Test Reward',
    rewardType: SeasonRewardType.GENERIC,
  };

  const createRoute = (
    params: Partial<RouteParams> = {},
  ): {
    params: RouteParams;
  } => ({
    params: { ...defaultRouteParams, ...params },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default selector mock
    mockUseSelector.mockImplementation(() => undefined);
  });

  describe('rendering', () => {
    it('renders bottom sheet with header', () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet route={createRoute()} />,
      );

      expect(getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL)).toBeOnTheScreen();
      expect(getByText('Reward Details')).toBeOnTheScreen();
    });

    it('renders title for non-LINEA_TOKENS reward', () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({ title: 'My Reward Title' })}
        />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_TITLE),
      ).toBeOnTheScreen();
      expect(getByText('My Reward Title')).toBeOnTheScreen();
    });

    it('renders description when provided', () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({ description: 'Test description' })}
        />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_DESCRIPTION),
      ).toBeOnTheScreen();
      expect(getByText('Test description')).toBeOnTheScreen();
    });

    it('renders contact info when provided', () => {
      const { getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({ contactInfo: 'Contact us at support@test.com' })}
        />,
      );

      expect(getByText('Contact us at support@test.com')).toBeOnTheScreen();
    });

    it('renders "Redeem" button for LINEA_TOKENS reward', () => {
      const { getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({ rewardType: SeasonRewardType.LINEA_TOKENS })}
        />,
      );

      expect(getByText('Redeem')).toBeOnTheScreen();
    });

    it('renders "Redeem" button for METAL_CARD reward', () => {
      const { getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({ rewardType: SeasonRewardType.METAL_CARD })}
        />,
      );

      expect(getByText('Redeem')).toBeOnTheScreen();
    });

    it('renders "Access" button for NANSEN reward', () => {
      const { getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({ rewardType: SeasonRewardType.NANSEN })}
        />,
      );

      expect(getByText('Access')).toBeOnTheScreen();
    });
  });

  describe('email input', () => {
    it('renders email input when showEmail is "required"', () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showEmail: 'required',
          })}
        />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT),
      ).toBeOnTheScreen();
      expect(getByText('Email')).toBeOnTheScreen();
    });

    it('renders email input when showEmail is "optional"', () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showEmail: 'optional',
          })}
        />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT),
      ).toBeOnTheScreen();
    });

    it('does not render email input when showEmail is false', () => {
      const { queryByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showEmail: false,
          })}
        />,
      );

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT),
      ).toBeNull();
    });

    it('updates email value on text change', () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showEmail: 'required',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('shows validation error for invalid email when required', async () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showEmail: 'required',
            rewardId: 'reward-1',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'invalid-email');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(getByText('Please enter a valid email')).toBeOnTheScreen();
      });
    });
  });

  describe('telegram input', () => {
    it('renders telegram input when showTelegram is truthy', () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showTelegram: 'optional',
          })}
        />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_TELEGRAM_INPUT),
      ).toBeOnTheScreen();
      expect(getByText('Telegram (optional)')).toBeOnTheScreen();
    });

    it('does not render telegram input when showTelegram is false', () => {
      const { queryByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            showTelegram: false,
          })}
        />,
      );

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_TELEGRAM_INPUT),
      ).toBeNull();
    });
  });

  describe('account selector', () => {
    it('renders account selector when showAccount is true and account is selected', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return {
            id: 'account-group-1',
            metadata: { name: 'Account 1' },
          };
        }
        if (selector === selectAvatarAccountType) {
          return 'blockies';
        }
        // For the EVM address selector (it's a function that returns a selector)
        return '0x1234567890abcdef1234567890abcdef12345678';
      });

      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.LINEA_TOKENS,
            showAccount: true,
          })}
        />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_ACCOUNT_SELECTOR),
      ).toBeOnTheScreen();
      expect(getByText('Select account to receive tokens')).toBeOnTheScreen();
    });

    it('does not render account selector when showAccount is false', () => {
      const { queryByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.LINEA_TOKENS,
            showAccount: false,
          })}
        />,
      );

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.CLAIM_MODAL_ACCOUNT_SELECTOR),
      ).toBeNull();
    });
  });

  describe('LINEA_TOKENS specific rendering', () => {
    it('renders default title for LINEA_TOKENS when amount is 0', () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.LINEA_TOKENS,
          })}
        />,
      );

      expect(
        getByTestId(
          REWARDS_VIEW_SELECTORS.CLAIM_MODAL_LINEA_TOKENS_DEFAULT_TITLE,
        ),
      ).toBeOnTheScreen();
      expect(getByText('Claim your LINEA tokens')).toBeOnTheScreen();
    });
  });

  describe('claim actions', () => {
    it('navigates to browser for NANSEN reward type', async () => {
      const testUrl = 'https://nansen.ai/claim/test';

      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.NANSEN,
            url: testUrl,
          })}
        />,
      );

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: testUrl,
          timestamp: expect.any(Number),
        },
      });
    });

    it('navigates to browser for OTHERSIDE reward type', async () => {
      const testUrl = 'https://otherside.xyz/claim/test';

      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.OTHERSIDE,
            url: testUrl,
          })}
        />,
      );

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: testUrl,
          timestamp: expect.any(Number),
        },
      });
    });

    it('does not navigate when URL is not provided for NANSEN', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.NANSEN,
            url: undefined,
          })}
        />,
      );

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls claimReward for METAL_CARD with valid email', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'required',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'test@example.com');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockClaimReward).toHaveBeenCalledWith('reward-metal-card', {
        data: {
          email: 'test@example.com',
        },
      });
    });

    it('calls claimReward for METAL_CARD with email and telegram', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'required',
            showTelegram: 'optional',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'test@example.com');

      const telegramInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_TELEGRAM_INPUT,
      );
      fireEvent.changeText(telegramInput, '@testuser');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockClaimReward).toHaveBeenCalledWith('reward-metal-card', {
        data: {
          email: 'test@example.com',
          telegramHandle: '@testuser',
        },
      });
    });

    it('does not call claimReward for METAL_CARD without rewardId', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: undefined,
            showEmail: 'required',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'test@example.com');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockClaimReward).not.toHaveBeenCalled();
    });

    it('calls claimReward for LINEA_TOKENS with recipient address', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return {
            id: 'account-group-1',
            metadata: { name: 'Account 1' },
          };
        }
        if (selector === selectAvatarAccountType) {
          return 'blockies';
        }
        // Mock the EVM address selector (the inline selector function)
        return '0x1234567890abcdef1234567890abcdef12345678';
      });

      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.LINEA_TOKENS,
            rewardId: 'reward-linea',
            showAccount: true,
          })}
        />,
      );

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockClaimReward).toHaveBeenCalledWith('reward-linea', {
        data: {
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
      });
    });
  });

  describe('modal close', () => {
    it('calls goBack when close button is pressed', () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet route={createRoute()} />,
      );

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('closes modal and shows success toast after successful METAL_CARD claim', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'required',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'test@example.com');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('shows error toast when claim fails', async () => {
      mockClaimReward.mockRejectedValueOnce(new Error('Claim failed'));

      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'required',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'test@example.com');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockRewardsToastOptions.error).toHaveBeenCalledWith(
        'Failed',
        'Please try again',
      );
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('tracks REWARDS_REWARD_VIEWED event on mount', () => {
      render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            seasonRewardId: 'test-season-reward',
            title: 'Test Reward',
          })}
        />,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'REWARDS_REWARD_VIEWED',
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks REWARDS_REWARD_CLAIMED event on successful claim', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.NANSEN,
            url: 'https://test.com',
            seasonRewardId: 'test-season-reward',
            title: 'Test Reward',
          })}
        />,
      );

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'REWARDS_REWARD_CLAIMED',
      );
    });
  });

  describe('email validation edge cases', () => {
    it('allows claim with valid email when showEmail is optional and email is provided', async () => {
      const { getByTestId } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'optional',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'valid@email.com');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockClaimReward).toHaveBeenCalled();
    });

    it('shows error when optional email is provided but invalid', async () => {
      const { getByTestId, getByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'optional',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'invalid-email');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(getByText('Please enter a valid email')).toBeOnTheScreen();
      });
      expect(mockClaimReward).not.toHaveBeenCalled();
    });

    it('clears email validation error when user types', async () => {
      const { getByTestId, queryByText } = render(
        <EndOfSeasonClaimBottomSheet
          route={createRoute({
            rewardType: SeasonRewardType.METAL_CARD,
            rewardId: 'reward-metal-card',
            showEmail: 'required',
          })}
        />,
      );

      const emailInput = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT,
      );
      fireEvent.changeText(emailInput, 'invalid');

      const confirmButton = getByTestId(
        REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      // Now type valid email
      fireEvent.changeText(emailInput, 'valid@email.com');

      await waitFor(() => {
        expect(queryByText('Please enter a valid email')).toBeNull();
      });
    });
  });
});

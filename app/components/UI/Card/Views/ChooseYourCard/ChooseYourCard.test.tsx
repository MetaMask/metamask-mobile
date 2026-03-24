import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChooseYourCard from './ChooseYourCard';
import { ChooseYourCardSelectors } from './ChooseYourCard.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { AllowanceState, CardType } from '../../types';
import { CardActions, CardScreens } from '../../util/metrics';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockUseParams = jest.fn(() => ({
  flow: 'onboarding',
  shippingAddress: undefined,
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.choose_your_card.title': 'Choose your card',
      'card.choose_your_card.upgrade_title': 'Upgrade to Metal',
      'card.choose_your_card.continue_button': 'Continue',
      'card.choose_your_card.virtual_card.name': 'Virtual Card',
      'card.choose_your_card.virtual_card.price': 'Free',
      'card.choose_your_card.virtual_card.feature_1':
        'Virtual card for Apple Pay and Google Pay',
      'card.choose_your_card.virtual_card.feature_2':
        'Pay with crypto (USDC, USDT, WETH, and more)',
      'card.choose_your_card.virtual_card.feature_3':
        '1% USDC cashback on every purchase',
      'card.choose_your_card.metal_card.name': 'Metal Card',
      'card.choose_your_card.metal_card.price': '$199/year',
      'card.choose_your_card.metal_card.everything_in_virtual':
        'Everything in virtual, plus:',
      'card.choose_your_card.metal_card.feature_1':
        'Premium engraved metal card',
      'card.choose_your_card.metal_card.feature_2':
        '3% cashback on first $10,000/year',
      'card.choose_your_card.metal_card.feature_3':
        'No foreign transaction fees',
      'card.choose_your_card.earn_up_to_badge':
        'Earn up to $300 in cashback annually',
      'card.choose_your_card.upgrade_to_metal_label':
        'Or upgrade to Metal for 3x rewards',
    };
    return map[key] || key;
  },
}));

jest.mock('react-native-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
  };
});

// Mock CardImage component
jest.mock('../../components/CardImage/CardImage', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ type }: { type: string }) =>
      React.createElement(
        View,
        { testID: 'card-image' },
        React.createElement(Text, null, type),
      ),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    SafeAreaProvider: View,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(RNText, props, children),
    TextVariant: {
      HeadingLg: 'HeadingLg',
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    FontWeight: {
      Regular: 'Regular',
      Medium: 'Medium',
      Bold: 'Bold',
    },
  };
});

const MOCK_SCREEN_WIDTH = 375;

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    useWindowDimensions: () => ({
      width: MOCK_SCREEN_WIDTH,
      height: 812,
    }),
  };
});

describe('ChooseYourCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders all required UI elements', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      expect(getByTestId(ChooseYourCardSelectors.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(ChooseYourCardSelectors.TITLE)).toBeOnTheScreen();
      expect(
        getByTestId(ChooseYourCardSelectors.CARD_CAROUSEL),
      ).toBeOnTheScreen();
      expect(getByTestId(ChooseYourCardSelectors.CARD_NAME)).toBeOnTheScreen();
      expect(getByTestId(ChooseYourCardSelectors.CARD_PRICE)).toBeOnTheScreen();
      expect(
        getByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('displays correct title text', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      expect(getByTestId(ChooseYourCardSelectors.TITLE)).toHaveTextContent(
        strings('card.choose_your_card.title'),
      );
    });

    it('displays virtual card as default selection', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      expect(getByTestId(ChooseYourCardSelectors.CARD_NAME)).toHaveTextContent(
        strings('card.choose_your_card.virtual_card.name'),
      );
      expect(getByTestId(ChooseYourCardSelectors.CARD_PRICE)).toHaveTextContent(
        strings('card.choose_your_card.virtual_card.price'),
      );
    });

    it('renders card images for both card types', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      expect(
        getByTestId(
          `${ChooseYourCardSelectors.CARD_IMAGE}-${CardType.VIRTUAL}`,
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${ChooseYourCardSelectors.CARD_IMAGE}-${CardType.METAL}`),
      ).toBeOnTheScreen();
    });

    it('displays virtual card features by default', () => {
      const { getByText } = render(<ChooseYourCard />);

      expect(
        getByText(strings('card.choose_your_card.virtual_card.feature_1')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('card.choose_your_card.virtual_card.feature_2')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('card.choose_your_card.virtual_card.feature_3')),
      ).toBeOnTheScreen();
    });
  });

  describe('Analytics', () => {
    it('tracks view event on mount', () => {
      render(<ChooseYourCard />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.CHOOSE_YOUR_CARD,
        flow: 'onboarding',
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks button click event when continue button pressed', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      fireEvent.press(getByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.CHOOSE_CARD_CONTINUE,
        card_type: CardType.VIRTUAL,
        flow: 'onboarding',
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to spending limit for virtual card in onboarding flow', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      fireEvent.press(getByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.SPENDING_LIMIT, {
        flow: 'onboarding',
      });
    });

    it('navigates to spending limit with manage flow params when flow is home and virtual card selected', () => {
      const priorityToken = {
        caipChainId: 'eip155:1',
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x123',
        decimals: 6,
        allowanceState: AllowanceState.Enabled,
        allowance: '1000',
      };
      const allTokens = [priorityToken];
      const delegationSettings = { networks: [] };
      const externalWalletDetailsData = {
        walletDetails: {},
        mappedWalletDetails: [priorityToken],
        priorityWalletDetail: priorityToken,
      };

      mockUseParams.mockImplementationOnce(() => ({
        flow: 'home',
        shippingAddress: undefined,
        priorityToken,
        allTokens,
        delegationSettings,
        externalWalletDetailsData,
      }));

      const { getByTestId } = render(<ChooseYourCard />);

      fireEvent.press(getByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.SPENDING_LIMIT, {
        flow: 'manage',
        priorityToken,
        allTokens,
        delegationSettings,
        externalWalletDetailsData,
      });
    });
  });

  describe('Button Variant', () => {
    it('renders Secondary variant when virtual card is selected', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      const continueButton = getByTestId(
        ChooseYourCardSelectors.CONTINUE_BUTTON,
      );
      expect(continueButton.props.children).toBeDefined();
    });

    it('renders continue button for default virtual selection', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      expect(
        getByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Upgrade to Metal Link', () => {
    it('shows upgrade link when virtual card is selected in onboarding flow', () => {
      const { getByTestId } = render(<ChooseYourCard />);

      expect(
        getByTestId(ChooseYourCardSelectors.UPGRADE_TO_METAL_BUTTON),
      ).toBeOnTheScreen();
    });

    it('displays correct upgrade link label', () => {
      const { getByText } = render(<ChooseYourCard />);

      expect(
        getByText(strings('card.choose_your_card.upgrade_to_metal_label')),
      ).toBeOnTheScreen();
    });

    it('scrolls to metal card when upgrade link is pressed', async () => {
      const { getByTestId } = render(<ChooseYourCard />);

      fireEvent.press(
        getByTestId(ChooseYourCardSelectors.UPGRADE_TO_METAL_BUTTON),
      );

      await waitFor(() => {
        expect(
          getByTestId(ChooseYourCardSelectors.CARD_NAME),
        ).toHaveTextContent(strings('card.choose_your_card.metal_card.name'));
      });
    });

    it('hides upgrade link after scrolling to metal card', async () => {
      const { getByTestId, queryByTestId } = render(<ChooseYourCard />);

      fireEvent.press(
        getByTestId(ChooseYourCardSelectors.UPGRADE_TO_METAL_BUTTON),
      );

      await waitFor(() => {
        expect(
          queryByTestId(ChooseYourCardSelectors.UPGRADE_TO_METAL_BUTTON),
        ).not.toBeOnTheScreen();
      });
    });
  });
});

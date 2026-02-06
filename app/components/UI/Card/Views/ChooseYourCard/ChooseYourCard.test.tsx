import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChooseYourCard from './ChooseYourCard';
import { ChooseYourCardSelectors } from '../../../../../../e2e/selectors/Card/ChooseYourCard.selectors';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { CardType } from '../../types';
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

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    flow: 'onboarding',
    shippingAddress: undefined,
  }),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    CARD_VIEWED: 'Card Viewed',
    CARD_BUTTON_CLICKED: 'Card Button Clicked',
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.choose_your_card.title': 'Choose your card',
      'card.choose_your_card.continue_button': 'Continue',
      'card.choose_your_card.virtual_card.name': 'Orange Virtual Card',
      'card.choose_your_card.virtual_card.price': 'Free',
      'card.choose_your_card.virtual_card.feature_1':
        'Virtual card for Apple Pay and Google Pay',
      'card.choose_your_card.virtual_card.feature_2':
        'Pay with crypto (USDC, USDT, WETH, and more)',
      'card.choose_your_card.virtual_card.feature_3':
        '1% USDC cashback on every purchase',
      'card.choose_your_card.metal_card.name': 'Metal Card',
      'card.choose_your_card.metal_card.price': '$199/year',
      'card.choose_your_card.metal_card.feature_1':
        'Engraved metal card and virtual card for Apple Pay and Google Pay',
      'card.choose_your_card.metal_card.feature_2':
        '3% cashback on the first $10,000 spent each year, then 1% after that',
      'card.choose_your_card.metal_card.feature_3':
        'No foreign transaction fees',
    };
    return map[key] || key;
  },
}));

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

      expect(getByTestId(ChooseYourCardSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(ChooseYourCardSelectors.TITLE)).toBeTruthy();
      expect(getByTestId(ChooseYourCardSelectors.CARD_CAROUSEL)).toBeTruthy();
      expect(getByTestId(ChooseYourCardSelectors.CARD_NAME)).toBeTruthy();
      expect(getByTestId(ChooseYourCardSelectors.CARD_PRICE)).toBeTruthy();
      expect(getByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON)).toBeTruthy();
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
      ).toBeTruthy();
      expect(
        getByTestId(`${ChooseYourCardSelectors.CARD_IMAGE}-${CardType.METAL}`),
      ).toBeTruthy();
    });

    it('displays virtual card features by default', () => {
      const { getByText } = render(<ChooseYourCard />);

      expect(
        getByText(strings('card.choose_your_card.virtual_card.feature_1')),
      ).toBeTruthy();
      expect(
        getByText(strings('card.choose_your_card.virtual_card.feature_2')),
      ).toBeTruthy();
      expect(
        getByText(strings('card.choose_your_card.virtual_card.feature_3')),
      ).toBeTruthy();
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
  });
});

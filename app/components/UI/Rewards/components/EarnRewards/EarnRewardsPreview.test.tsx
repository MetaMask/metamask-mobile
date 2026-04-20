import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import EarnRewardsPreview from './EarnRewardsPreview';
import Routes from '../../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('../../../../../core/DeeplinkManager', () => ({
  handleDeeplink: jest.fn(),
}));
const mockHandleDeeplink = handleDeeplink as jest.MockedFunction<
  typeof handleDeeplink
>;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { primary: { default: 'blue' } } }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.earn_rewards.title': 'Earn rewards',
      'rewards.earn_rewards.musd_title': 'Up to 3% bonus on stables',
      'rewards.earn_rewards.musd_subtitle': 'Calculate your mUSD bonus',
      'rewards.earn_rewards.card_title': 'Up to 3% cash back',
      'rewards.earn_rewards.card_subtitle': 'Get your MetaMask Card now',
      'rewards.earn_rewards.card_subtitle_cardholder':
        'Access your MetaMask Card benefits',
    };
    return map[key] || key;
  },
}));

jest.mock(
  '../../../../../images/rewards/rewards-musd-earn.png',
  () => 'musd-img',
);
jest.mock(
  '../../../../../images/rewards/rewards-card-earn.png',
  () => 'card-img',
);

import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';
import {
  selectCardIsLoaded,
  selectIsCardholder,
  selectIsAuthenticatedCard,
  selectIsUserInSupportedCardCountry,
} from '../../../../../core/redux/slices/card';

interface SetupOptions {
  geoLocation?: string;
  geoStatus?: 'idle' | 'loading' | 'complete';
  isCardGeoLoaded?: boolean;
  isUserInSupportedCardCountry?: boolean;
  isCardholder?: boolean;
  isAuthenticatedCard?: boolean;
}

const setupSelectors = ({
  geoLocation,
  geoStatus = 'complete',
  isCardGeoLoaded = true,
  isUserInSupportedCardCountry = true,
  isCardholder = false,
  isAuthenticatedCard = false,
}: SetupOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectGeolocationLocation)
      return geoLocation === undefined ? undefined : geoLocation;
    if (selector === selectGeolocationStatus) return geoStatus;
    if (selector === selectCardIsLoaded) return isCardGeoLoaded;
    if (selector === selectIsUserInSupportedCardCountry)
      return isUserInSupportedCardCountry;
    if (selector === selectIsCardholder) return isCardholder;
    if (selector === selectIsAuthenticatedCard) return isAuthenticatedCard;
    return undefined;
  });
};

describe('EarnRewardsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('section title', () => {
    it('always renders the title', () => {
      setupSelectors();
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Earn rewards')).toBeOnTheScreen();
    });

    it('renders the title even while rewards geo is loading', () => {
      setupSelectors({ geoStatus: 'loading' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Earn rewards')).toBeOnTheScreen();
    });

    it('renders the title even while card geo is loading', () => {
      setupSelectors({ isCardGeoLoaded: false });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Earn rewards')).toBeOnTheScreen();
    });
  });

  describe('geo loading state', () => {
    it('shows mUSD skeleton and renders card card while mUSD geo is loading', () => {
      // card geo is complete and country is supported by default
      setupSelectors({ geoStatus: 'loading' });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('shows mUSD skeleton and renders card card while mUSD geo is idle (not yet started)', () => {
      setupSelectors({ geoStatus: 'idle' });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('shows card skeleton and renders mUSD card while card geo is loading', () => {
      setupSelectors({
        geoLocation: 'US',
        geoStatus: 'complete',
        isCardGeoLoaded: false,
      });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('shows both skeletons when both geos are still loading', () => {
      setupSelectors({ geoStatus: 'loading', isCardGeoLoaded: false });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });
  });

  describe('after geo loaded — both allowed', () => {
    it('shows both mUSD and card cards when both geos allow', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('hides mUSD card when geoLocation is undefined even if geo status is complete', () => {
      setupSelectors({ geoLocation: undefined });
      const { queryByTestId, getByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('shows mUSD card when geoLocation is UNKNOWN (treated as non-UK)', () => {
      setupSelectors({ geoLocation: 'UNKNOWN' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
    });

    it('renders correct text for mUSD card', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Up to 3% bonus on stables')).toBeOnTheScreen();
      expect(getByText('Calculate your mUSD bonus')).toBeOnTheScreen();
    });

    it('renders correct text for MetaMask card', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Up to 3% cash back')).toBeOnTheScreen();
      expect(getByText('Get your MetaMask Card now')).toBeOnTheScreen();
    });
  });

  describe('card subtitle — cardholder state', () => {
    it('shows cardholder subtitle when isCardholder is true', () => {
      setupSelectors({ geoLocation: 'US', isCardholder: true });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Access your MetaMask Card benefits')).toBeOnTheScreen();
    });

    it('shows cardholder subtitle when isAuthenticatedCard is true', () => {
      setupSelectors({
        geoLocation: 'US',
        isAuthenticatedCard: true,
      });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Access your MetaMask Card benefits')).toBeOnTheScreen();
    });

    it('shows cardholder subtitle when both isCardholder and isAuthenticatedCard are true', () => {
      setupSelectors({
        geoLocation: 'US',
        isCardholder: true,
        isAuthenticatedCard: true,
      });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Access your MetaMask Card benefits')).toBeOnTheScreen();
    });

    it('shows default subtitle when neither isCardholder nor isAuthenticatedCard', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Get your MetaMask Card now')).toBeOnTheScreen();
    });
  });

  describe('after geo loaded — UK user', () => {
    it('hides mUSD card for UK users but shows card card when card geo is allowed', () => {
      setupSelectors({ geoLocation: 'GB' });
      const { queryByTestId, getByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });
  });

  describe('after geo loaded — card blocked (unsupported country)', () => {
    it('shows mUSD card but hides card card when country is not in supported list', () => {
      setupSelectors({
        geoLocation: 'US',
        isUserInSupportedCardCountry: false,
      });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('hides card card when user is not in a supported card country', () => {
      setupSelectors({
        geoLocation: 'US',
        isUserInSupportedCardCountry: false,
      });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('hides both cards when user is in UK and card country is not supported', () => {
      setupSelectors({
        geoLocation: 'GB',
        isUserInSupportedCardCountry: false,
      });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('hides card card when geoLocation is UNKNOWN (not a supported card country)', () => {
      setupSelectors({
        geoLocation: 'UNKNOWN',
        isUserInSupportedCardCountry: false,
      });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });
  });

  describe('navigation', () => {
    it('navigates to mUSD calculator view when mUSD card is pressed', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      fireEvent.press(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_MUSD_CALCULATOR_VIEW,
      );
    });

    it('triggers card-onboarding deeplink when card card is pressed', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      fireEvent.press(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      );
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'metamask://card-onboarding',
      });
    });
  });
});

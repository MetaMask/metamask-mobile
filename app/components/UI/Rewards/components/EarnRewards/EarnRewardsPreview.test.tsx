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
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
} from '../../../../../reducers/rewards/selectors';
import {
  selectCardGeoLocation,
  selectCardIsLoaded,
} from '../../../../../core/redux/slices/card';
import { selectCardSupportedCountries } from '../../../../../selectors/featureFlagController/card';

const DEFAULT_CARD_SUPPORTED_COUNTRIES: Record<string, boolean> = {
  US: true,
  CA: true,
};

interface SetupOptions {
  optinAllowedForGeo?: boolean | null;
  isGeoLoading?: boolean;
  isCardGeoLoaded?: boolean;
  cardGeoLocation?: string;
  cardSupportedCountries?: Record<string, boolean>;
}

const setupSelectors = ({
  optinAllowedForGeo = null,
  isGeoLoading = false,
  isCardGeoLoaded = true,
  cardGeoLocation = 'US',
  cardSupportedCountries = DEFAULT_CARD_SUPPORTED_COUNTRIES,
}: SetupOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectOptinAllowedForGeo) return optinAllowedForGeo;
    if (selector === selectOptinAllowedForGeoLoading) return isGeoLoading;
    if (selector === selectCardIsLoaded) return isCardGeoLoaded;
    if (selector === selectCardGeoLocation) return cardGeoLocation;
    if (selector === selectCardSupportedCountries)
      return cardSupportedCountries;
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
      setupSelectors({ isGeoLoading: true });
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
    it('shows skeletons while rewards geo is loading', () => {
      setupSelectors({ isGeoLoading: true });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('shows skeletons while card geo is loading', () => {
      setupSelectors({ isCardGeoLoaded: false });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('shows skeletons when both geos are still loading', () => {
      setupSelectors({ isGeoLoading: true, isCardGeoLoaded: false });
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
      setupSelectors({ optinAllowedForGeo: true });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('shows both cards when optinAllowedForGeo is null (undetermined, not blocked)', () => {
      setupSelectors({ optinAllowedForGeo: null });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('renders correct text for mUSD card', () => {
      setupSelectors({ optinAllowedForGeo: true });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Up to 3% bonus on stables')).toBeOnTheScreen();
      expect(getByText('Calculate your mUSD bonus')).toBeOnTheScreen();
    });

    it('renders correct text for MetaMask card', () => {
      setupSelectors({ optinAllowedForGeo: true });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Up to 3% cash back')).toBeOnTheScreen();
      expect(getByText('Get your MetaMask Card now')).toBeOnTheScreen();
    });
  });

  describe('after geo loaded — mUSD blocked (UK)', () => {
    it('hides mUSD card and shows card card when rewards geo is false but card geo is allowed', () => {
      setupSelectors({ optinAllowedForGeo: false });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
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
        optinAllowedForGeo: true,
        cardGeoLocation: 'CN',
        cardSupportedCountries: { US: true, CA: true },
      });
      const { getByTestId, queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('hides card card when geoLocation is UNKNOWN (not in supported countries)', () => {
      setupSelectors({
        optinAllowedForGeo: true,
        cardGeoLocation: 'UNKNOWN',
        cardSupportedCountries: { US: true },
      });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });

    it('hides both cards when both geos are restricted', () => {
      setupSelectors({
        optinAllowedForGeo: false,
        cardGeoLocation: 'CN',
        cardSupportedCountries: { US: true },
      });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeNull();
    });
  });

  describe('navigation', () => {
    it('navigates to mUSD calculator view when mUSD card is pressed', () => {
      setupSelectors({ optinAllowedForGeo: true });
      const { getByTestId } = render(<EarnRewardsPreview />);
      fireEvent.press(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MUSD_CALCULATOR_VIEW);
    });

    it('triggers card-onboarding deeplink when card card is pressed', () => {
      setupSelectors({ optinAllowedForGeo: true });
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

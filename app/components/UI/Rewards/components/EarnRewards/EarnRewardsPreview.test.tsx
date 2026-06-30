import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import EarnRewardsPreview from './EarnRewardsPreview';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';

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

jest.mock('../../../Money/hooks/useMoneyAccountBalance', () => jest.fn());
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { primary: { default: 'blue' } } }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'rewards.earn_rewards.title': 'Earn rewards',
      'rewards.earn_rewards.musd_title': 'Up to {{percentage}}% bonus on mUSD',
      'rewards.earn_rewards.musd_subtitle': 'Money accounts are here',
      'rewards.earn_rewards.card_title': 'Up to 3% back on spend',
      'rewards.earn_rewards.card_subtitle': 'Get your MetaMask Card now',
      'rewards.earn_rewards.card_subtitle_cardholder':
        'Access your MetaMask Card benefits',
    };
    const value = map[key] || key;
    return params
      ? Object.entries(params).reduce(
          (text, [paramKey, paramValue]) =>
            text.replace(`{{${paramKey}}}`, String(paramValue)),
          value,
        )
      : value;
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
  selectIsCardholder,
  selectIsCardAuthenticated,
} from '../../../../../selectors/cardController';
import { selectMoneyEnableMoneyAccountFlag } from '../../../Money/selectors/featureFlags';

interface SetupOptions {
  geoLocation?: string;
  geoStatus?: 'idle' | 'loading' | 'complete';
  isCardholder?: boolean;
  isAuthenticatedCard?: boolean;
  isMoneyAccountEnabled?: boolean;
}

const setupSelectors = ({
  geoLocation,
  geoStatus = 'complete',
  isCardholder = false,
  isAuthenticatedCard = false,
  isMoneyAccountEnabled = true,
}: SetupOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectGeolocationLocation)
      return geoLocation === undefined ? undefined : geoLocation;
    if (selector === selectGeolocationStatus) return geoStatus;
    if (selector === selectMoneyEnableMoneyAccountFlag)
      return isMoneyAccountEnabled;
    if (selector === selectIsCardholder) return isCardholder;
    if (selector === selectIsCardAuthenticated) return isAuthenticatedCard;
    return undefined;
  });
};

describe('EarnRewardsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: 3.8,
    } as ReturnType<typeof useMoneyAccountBalance>);
  });

  describe('section title', () => {
    it('renders the title when the section is visible (non-UK, geo settled)', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Earn rewards')).toBeOnTheScreen();
    });

    it('renders the title even while rewards geo is loading', () => {
      setupSelectors({ geoStatus: 'loading' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Earn rewards')).toBeOnTheScreen();
    });
  });

  describe('geo loading state', () => {
    it('shows mUSD skeleton and renders MetaMask Card row while mUSD geo is loading', () => {
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

    it('shows mUSD skeleton and renders MetaMask Card row while mUSD geo is idle (not yet started)', () => {
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

    it('shows mUSD card (not skeleton) and MetaMask Card when geo is still loading but location is already known (e.g. US)', () => {
      setupSelectors({
        geoLocation: 'US',
        geoStatus: 'loading',
      });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });
  });

  describe('after geo loaded — both allowed', () => {
    it('shows both mUSD and MetaMask Card rows when geo allows mUSD', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('hides only the mUSD card when geoLocation is undefined, keeps Card card visible', () => {
      setupSelectors({ geoLocation: undefined });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });

    it('hides only the mUSD card when Money account feature flag is disabled, keeps Card card visible', () => {
      setupSelectors({ geoLocation: 'US', isMoneyAccountEnabled: false });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
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
      expect(getByText('Up to 3.8% bonus on mUSD')).toBeOnTheScreen();
      expect(getByText('Money accounts are here')).toBeOnTheScreen();
    });

    it('falls back to 3% in the mUSD card title when APY is unavailable', () => {
      mockUseMoneyAccountBalance.mockReturnValue({
        apyPercent: undefined,
      } as ReturnType<typeof useMoneyAccountBalance>);
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Up to 3% bonus on mUSD')).toBeOnTheScreen();
    });

    it('renders correct text for MetaMask card', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Up to 3% back on spend')).toBeOnTheScreen();
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
    it('hides only the mUSD card for UK users, keeps the Card card visible', () => {
      setupSelectors({ geoLocation: 'GB' });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('opens Money deeplink when mUSD card is pressed', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      fireEvent.press(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      );
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'metamask://money',
      });
    });

    it('triggers card-home deeplink when card card is pressed', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      fireEvent.press(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD),
      );
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'metamask://card-home',
      });
    });
  });
});

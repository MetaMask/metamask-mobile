import React from 'react';
import { ActivityIndicator, Dimensions } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import EarnRewardsPreview from './EarnRewardsPreview';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import Routes from '../../../../../constants/navigation/Routes';
import { MONEY_DISCLAIMER_URL } from '../../../../../constants/urls';

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

jest.mock('../../../Money/hooks/useMoneyVaultApy', () => jest.fn());
const mockUseMoneyVaultApy = useMoneyVaultApy as jest.MockedFunction<
  typeof useMoneyVaultApy
>;

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
      'rewards.earn_rewards.musd_money_title': 'Earn up to {{percentage}}% APY',
      'rewards.earn_rewards.musd_disclaimer_accessibility_label':
        'mUSD APY disclaimer',
      'rewards.earn_rewards.musd_subtitle': 'Money accounts are here',
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

import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';
import { selectMoneyEnableMoneyAccountFlag } from '../../../Money/selectors/featureFlags';

interface SetupOptions {
  geoLocation?: string;
  geoStatus?: 'idle' | 'loading' | 'complete';
  isMoneyAccountEnabled?: boolean;
}

const setupSelectors = ({
  geoLocation,
  geoStatus = 'complete',
  isMoneyAccountEnabled = true,
}: SetupOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectGeolocationLocation)
      return geoLocation === undefined ? undefined : geoLocation;
    if (selector === selectGeolocationStatus) return geoStatus;
    if (selector === selectMoneyEnableMoneyAccountFlag)
      return isMoneyAccountEnabled;
    return undefined;
  });
};

describe('EarnRewardsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 3.8,
    } as ReturnType<typeof useMoneyVaultApy>);
  });

  describe('section title', () => {
    it('renders the title when the section is visible (non-UK, geo settled)', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText('Earn rewards')).toBeOnTheScreen();
    });

    it('does not render Earn rewards while the location is still unknown', () => {
      setupSelectors({ geoStatus: 'loading' });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
    });
  });

  describe('geo loading state', () => {
    it('shows a header spinner while a known non-UK location is still loading', () => {
      setupSelectors({ geoLocation: 'US', geoStatus: 'loading' });

      const { UNSAFE_getByType } = render(<EarnRewardsPreview />);

      expect(UNSAFE_getByType(ActivityIndicator)).toBeDefined();
    });

    it('hides the header spinner after geo has settled', () => {
      setupSelectors({ geoLocation: 'US', geoStatus: 'complete' });

      const { UNSAFE_queryByType } = render(<EarnRewardsPreview />);

      expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });

    it('does not render Earn rewards while the location is unknown and geo is loading', () => {
      setupSelectors({ geoStatus: 'loading' });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
    });

    it('does not render Earn rewards while geo is idle and the location is unknown', () => {
      setupSelectors({ geoStatus: 'idle' });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
    });

    it('does not render Earn rewards for the UK while geo is still loading', () => {
      setupSelectors({ geoLocation: 'GB', geoStatus: 'loading' });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
    });

    it('shows the mUSD slide when geo is still loading but the location is already known', () => {
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
    });
  });

  describe('after geo loaded', () => {
    it('shows the mUSD slide when the location allows it', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD),
      ).toBeOnTheScreen();
    });

    it('sizes the only tile to the full section width', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);
      const tile = getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD);
      const sectionWidth = Dimensions.get('window').width - 32;
      let node: { props?: { style?: unknown }; parent?: typeof node } | null =
        tile;
      let width: number | undefined;
      for (
        let depth = 0;
        depth < 8 && node && width === undefined;
        depth += 1
      ) {
        const style = node.props?.style;
        const entries = Array.isArray(style) ? style : [style];
        for (const entry of entries) {
          if (
            entry &&
            typeof entry === 'object' &&
            'width' in entry &&
            typeof entry.width === 'number'
          ) {
            width = entry.width;
          }
        }
        node = node.parent ?? null;
      }

      expect(width).toBe(sectionWidth);
    });

    it('does not render Earn rewards when the location is unknown', () => {
      setupSelectors({ geoLocation: undefined });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
    });

    it('does not render Earn rewards when the Money account is disabled', () => {
      setupSelectors({ geoLocation: 'US', isMoneyAccountEnabled: false });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
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
      expect(getByText(/Earn up to 3\.8% APY/)).toBeOnTheScreen();
      expect(getByText('*')).toBeOnTheScreen();
      expect(getByText('Money accounts are here')).toBeOnTheScreen();
    });

    it('falls back to 3% in the mUSD card title when APY is unavailable', () => {
      mockUseMoneyVaultApy.mockReturnValue({
        apyPercent: undefined,
      } as ReturnType<typeof useMoneyVaultApy>);
      setupSelectors({ geoLocation: 'US' });
      const { getByText } = render(<EarnRewardsPreview />);
      expect(getByText(/Earn up to 3% APY/)).toBeOnTheScreen();
    });
  });

  describe('after geo loaded — UK user', () => {
    it('does not render Earn rewards for UK users', () => {
      setupSelectors({ geoLocation: 'GB' });
      const { queryByTestId } = render(<EarnRewardsPreview />);
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
      ).toBeNull();
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

    it('opens the APY disclaimer in the in-app browser when the asterisk is pressed', () => {
      setupSelectors({ geoLocation: 'US' });
      const { getByTestId } = render(<EarnRewardsPreview />);

      fireEvent.press(
        getByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_DISCLAIMER_LINK),
        { stopPropagation: jest.fn() },
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: expect.objectContaining({
          newTabUrl: MONEY_DISCLAIMER_URL,
        }),
      });
      expect(mockHandleDeeplink).not.toHaveBeenCalled();
    });
  });
});

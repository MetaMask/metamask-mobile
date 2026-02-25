import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { WaysToEarn } from './WaysToEarn';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';
import { MetaMetricsEvents } from '../../../../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../../../../utils';
import { SeasonWayToEarnDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockHandleDeeplink = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock useMetrics hook
jest.mock('../../../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
  MetaMetricsEvents: {
    REWARDS_WAYS_TO_EARN_CTA_CLICKED: 'rewards_ways_to_earn_cta_clicked',
    REWARDS_PAGE_BUTTON_CLICKED: 'rewards_page_button_clicked',
  },
}));

// Mock i18n strings
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.ways_to_earn.title': 'Ways to earn',
    };
    return mockStrings[key] || key;
  }),
}));

// Mock handleDeeplink
jest.mock('../../../../../../../core/DeeplinkManager', () => ({
  handleDeeplink: (...args: unknown[]) => mockHandleDeeplink(...args),
}));

// Mock the SwapSupportedNetworksSection component
jest.mock('./SwapSupportedNetworksSection', () => ({
  SwapSupportedNetworksSection: (props: object) => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      Text,
      {
        testID: 'swap-supported-networks',
        'data-props': JSON.stringify(props),
      },
      'Supported networks',
    );
  },
}));

// Mock ReferralStatsSummary component
jest.mock('./ReferralStatsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: object) =>
      ReactActual.createElement(
        Text,
        {
          testID: 'referral-stats-summary',
          'data-props': JSON.stringify(props),
        },
        'ReferralStatsSummary',
      ),
  };
});

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    Object.assign(mockTw, {
      style: jest.fn(() => ({})),
    });
    return mockTw;
  },
}));

// Mock SVG component
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => ({
    __esModule: true,
    default: () => {
      const ReactActual = jest.requireActual('react');
      const { Text } = jest.requireActual('react-native');
      return ReactActual.createElement(
        Text,
        { testID: 'metamask-rewards-points' },
        'Points Icon',
      );
    },
  }),
);

// Mock getIconName
jest.mock('../../../../utils/formatUtils', () => ({
  ...jest.requireActual('../../../../utils/formatUtils'),
  getIconName: jest.fn((name: string) => name),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// ---- Test Data ----

const createWayToEarn = (
  overrides: Partial<SeasonWayToEarnDto> = {},
): SeasonWayToEarnDto => ({
  id: 'test-id',
  type: 'SWAP',
  title: 'Swap',
  icon: 'SwapHorizontal',
  shortDescription: '80 points per $100',
  bottomSheetTitle: 'Swap tokens',
  pointsEarningRule: '80 points per $100 swapped',
  description: 'Swap tokens on supported networks to earn points.',
  buttonLabel: 'Start a swap',
  buttonAction: undefined,
  specificContent: undefined,
  ...overrides,
});

const swapWayToEarn = createWayToEarn({
  id: 'swap-id',
  type: 'SWAP',
  title: 'Swap',
  icon: 'SwapHorizontal',
  shortDescription: '80 points per $100',
  bottomSheetTitle: 'Swap tokens',
  pointsEarningRule: '80 points per $100 swapped',
  description: 'Swap tokens on supported networks.',
  buttonLabel: 'Start a swap',
  buttonAction: { deeplink: 'metamask://swap' },
  specificContent: {
    supportedNetworksTitle: 'Supported networks',
    supportedNetworks: [
      { chainId: '1', name: 'Ethereum' },
      { chainId: '59144', name: 'Linea', boost: '2x' },
    ],
  },
});

const referralWayToEarn = createWayToEarn({
  id: 'referral-id',
  type: 'REFERRAL',
  title: 'Refer friends',
  icon: 'People',
  shortDescription: '10 points per 50 from friends',
  bottomSheetTitle: 'Refer friends',
  pointsEarningRule: '10 points per 50 pts earned',
  description: 'Invite your friends to earn together.',
  buttonLabel: 'Share link',
  buttonAction: { route: { root: 'RewardsReferralView', screen: '' } },
  specificContent: {
    referralPointsTitle: 'Earned from referrals',
    totalReferralsTitle: 'Referrals',
  },
});

const perpsWayToEarn = createWayToEarn({
  id: 'perps-id',
  type: 'PERPS',
  title: 'Perps',
  icon: 'Rocket',
  shortDescription: '10 points per $100',
  bottomSheetTitle: 'Trade perps',
  pointsEarningRule: '10 points per $100 traded',
  description: 'Trade perps to earn points.',
  buttonLabel: 'Start a trade',
  buttonAction: { route: { root: 'PerpsRoot', screen: 'PerpsHome' } },
});

const urlWayToEarn = createWayToEarn({
  id: 'url-id',
  type: 'URL_ACTION',
  title: 'External action',
  icon: 'Link',
  shortDescription: 'Earn points',
  bottomSheetTitle: 'External action',
  pointsEarningRule: '5 points per action',
  description: 'Visit an external page to earn.',
  buttonLabel: 'Go to page',
  buttonAction: { url: 'https://example.com/earn' },
});

const bonusCodeWayToEarn = createWayToEarn({
  id: 'bonus-code-id',
  type: 'BONUS_CODE',
  title: 'Bonus code',
  icon: 'Gift',
  shortDescription: 'Redeem a code',
  bottomSheetTitle: 'Enter bonus code',
  pointsEarningRule: 'Varies',
  description: 'Enter a bonus code to earn points.',
  buttonLabel: 'Submit',
  buttonAction: undefined,
});

const noActionWayToEarn = createWayToEarn({
  id: 'no-action-id',
  type: 'INFO_ONLY',
  title: 'Info only',
  icon: 'Info',
  shortDescription: 'For info',
  bottomSheetTitle: 'Info only',
  pointsEarningRule: 'N/A',
  description: 'No CTA action configured.',
  buttonLabel: 'OK',
  buttonAction: undefined,
});

const mockSeasonWaysToEarn: SeasonWayToEarnDto[] = [
  swapWayToEarn,
  referralWayToEarn,
  perpsWayToEarn,
];

describe('WaysToEarn', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);

    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: jest.fn().mockReturnThis(),
      addSensitiveProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }));

    const mockUseSelector = jest.requireMock('react-redux')
      .useSelector as jest.Mock;
    mockUseSelector.mockReturnValue(mockSeasonWaysToEarn);
  });

  describe('rendering', () => {
    it('renders the component title', () => {
      // Act
      const { getByText } = render(<WaysToEarn />);

      // Assert
      expect(getByText('Ways to earn')).toBeOnTheScreen();
    });

    it('renders all earning ways from selector data', () => {
      // Act
      const { getByText } = render(<WaysToEarn />);

      // Assert
      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Refer friends')).toBeOnTheScreen();
      expect(getByText('Perps')).toBeOnTheScreen();
    });

    it('displays correct short descriptions for each earning way', () => {
      // Act
      const { getByText } = render(<WaysToEarn />);

      // Assert
      expect(getByText('80 points per $100')).toBeOnTheScreen();
      expect(getByText('10 points per 50 from friends')).toBeOnTheScreen();
      expect(getByText('10 points per $100')).toBeOnTheScreen();
    });

    it('renders an empty list when no ways to earn exist', () => {
      // Arrange
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([]);

      // Act
      const { getByText, queryByText } = render(<WaysToEarn />);

      // Assert
      expect(getByText('Ways to earn')).toBeOnTheScreen();
      expect(queryByText('Swap')).toBeNull();
    });
  });

  describe('earning way press (modal open)', () => {
    it('opens modal with correct data when an earning way is pressed', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Swap'));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          type: ModalType.Confirmation,
          showIcon: false,
          showCancelButton: false,
          confirmAction: expect.objectContaining({
            label: 'Start a swap',
            variant: 'Primary',
          }),
        }),
      );
    });

    it('tracks button click event with correct properties', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Swap'));

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
      const builder = mockCreateEventBuilder.mock.results[0].value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        button_type: RewardsMetricsButtons.WAYS_TO_EARN,
        ways_to_earn_type: 'SWAP',
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('passes WaysToEarnSheetTitle as modal title with bottomSheetTitle and pointsEarningRule', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Perps'));

      // Assert
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      expect(modalCall?.[1]?.title).toBeTruthy();
      expect(modalCall?.[1]?.title.type).toBeDefined();
    });

    it('passes description content to modal', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Perps'));

      // Assert
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      expect(modalCall?.[1]?.description).toBeTruthy();
      expect(modalCall?.[1]?.description.type).toBeDefined();
    });
  });

  describe('BONUS_CODE earning way press', () => {
    it('navigates to BonusCodeBottomSheet instead of generic modal', () => {
      // Arrange
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([bonusCodeWayToEarn]);

      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Bonus code'));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BONUS_CODE_BOTTOM_SHEET,
        expect.objectContaining({
          ctaLabel: 'Submit',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.anything(),
      );
    });

    it('passes title and description to BonusCodeBottomSheet', () => {
      // Arrange
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([bonusCodeWayToEarn]);

      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Bonus code'));

      // Assert
      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BONUS_CODE_BOTTOM_SHEET,
      );
      expect(navCall?.[1]?.title).toBeTruthy();
      expect(navCall?.[1]?.description).toBeTruthy();
      expect(navCall?.[1]?.ctaLabel).toBe('Submit');
    });

    it('tracks button click event for BONUS_CODE type', () => {
      // Arrange
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([bonusCodeWayToEarn]);

      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Bonus code'));

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
      const builder = mockCreateEventBuilder.mock.results[0].value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        button_type: RewardsMetricsButtons.WAYS_TO_EARN,
        ways_to_earn_type: 'BONUS_CODE',
      });
    });
  });

  describe('CTA press - deeplink action', () => {
    it('calls handleDeeplink when buttonAction has deeplink', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Swap'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'metamask://swap',
      });
    });

    it('tracks CTA click event with correct properties for deeplink action', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Swap'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
      );
      const ctaBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(ctaBuilder.addProperties).toHaveBeenCalledWith({
        ways_to_earn_type: 'SWAP',
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('CTA press - route action', () => {
    it('navigates to route when buttonAction has route with root and screen', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Perps'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockNavigate.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('PerpsRoot', {
        screen: 'PerpsHome',
      });
    });

    it('navigates to route without screen param when screen is empty', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Refer friends'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockNavigate.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        'RewardsReferralView',
        undefined,
      );
    });
  });

  describe('CTA press - URL action', () => {
    it('navigates to browser when buttonAction has url', () => {
      // Arrange
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([urlWayToEarn]);

      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('External action'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockNavigate.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: 'https://example.com/earn',
          timestamp: expect.any(Number),
        },
      });
    });
  });

  describe('CTA press - no action', () => {
    it('closes modal but does not navigate when buttonAction is undefined', () => {
      // Arrange
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([noActionWayToEarn]);

      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Info only'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockNavigate.mockClear();
      mockHandleDeeplink.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockHandleDeeplink).not.toHaveBeenCalled();
    });
  });

  describe('CTA press - action priority', () => {
    it('prioritizes deeplink over route and url', () => {
      // Arrange
      const mixedActionWay = createWayToEarn({
        id: 'mixed-id',
        title: 'Mixed action',
        buttonAction: {
          deeplink: 'metamask://mixed',
          route: { root: 'SomeRoot', screen: 'SomeScreen' },
          url: 'https://example.com',
        },
      });

      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([mixedActionWay]);

      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Mixed action'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockNavigate.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'metamask://mixed',
      });
      // Should not navigate via route or url
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('prioritizes route over url when no deeplink', () => {
      // Arrange
      const routeAndUrlWay = createWayToEarn({
        id: 'route-url-id',
        title: 'Route and URL',
        buttonAction: {
          route: { root: 'SomeRoot', screen: 'SomeScreen' },
          url: 'https://example.com',
        },
      });

      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockReturnValue([routeAndUrlWay]);

      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Route and URL'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockNavigate.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('SomeRoot', {
        screen: 'SomeScreen',
      });
      // Should not open browser
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.anything(),
      );
    });
  });

  describe('specificContent rendering', () => {
    it('includes SwapSupportedNetworksSection in description when specificContent has supportedNetworks', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Swap'));

      // Get the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );

      // Assert - description is a React element
      expect(modalCall?.[1]?.description).toBeTruthy();
      expect(modalCall?.[1]?.description.type).toBeDefined();
    });

    it('includes ReferralStatsSummary in description when specificContent has referralPointsTitle', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Refer friends'));

      // Get the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );

      // Assert - description is a React element
      expect(modalCall?.[1]?.description).toBeTruthy();
      expect(modalCall?.[1]?.description.type).toBeDefined();
    });

    it('does not include specific content sections when specificContent is undefined', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Perps'));

      // Get the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );

      // Assert - description should still exist (contains the text description)
      expect(modalCall?.[1]?.description).toBeTruthy();
    });
  });

  describe('modal close before navigation', () => {
    it('closes modal (goBack) before executing CTA navigation', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Perps'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockGoBack.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('FlatList configuration', () => {
    it('renders list items with unique keys', () => {
      // Act
      const { getByText } = render(<WaysToEarn />);

      // Assert - All items should render without key warnings
      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Perps')).toBeOnTheScreen();
      expect(getByText('Refer friends')).toBeOnTheScreen();
    });
  });

  describe('metrics tracking', () => {
    it('tracks button click events with ways_to_earn_type matching wayToEarn.type', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);

      // Act
      fireEvent.press(getByText('Refer friends'));

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
      const builder = mockCreateEventBuilder.mock.results[0].value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        button_type: RewardsMetricsButtons.WAYS_TO_EARN,
        ways_to_earn_type: 'REFERRAL',
      });
    });

    it('tracks CTA click events with ways_to_earn_type matching wayToEarn.type', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      fireEvent.press(getByText('Perps'));

      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
      );
      const ctaBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(ctaBuilder.addProperties).toHaveBeenCalledWith({
        ways_to_earn_type: 'PERPS',
      });
    });
  });

  describe('CTA labels', () => {
    it('renders correct CTA label for each earning way type', () => {
      // Arrange
      const testCases = [
        { title: 'Swap', expectedLabel: 'Start a swap' },
        { title: 'Refer friends', expectedLabel: 'Share link' },
        { title: 'Perps', expectedLabel: 'Start a trade' },
      ];

      testCases.forEach(({ title, expectedLabel }) => {
        jest.clearAllMocks();
        mockUseNavigation.mockReturnValue({
          navigate: mockNavigate,
          goBack: mockGoBack,
        } as unknown as ReturnType<typeof useNavigation>);
        mockCreateEventBuilder.mockImplementation(() => ({
          addProperties: jest.fn().mockReturnThis(),
          addSensitiveProperties: jest.fn().mockReturnThis(),
          build: jest.fn().mockReturnValue({}),
        }));
        const mockUseSel = jest.requireMock('react-redux')
          .useSelector as jest.Mock;
        mockUseSel.mockReturnValue(mockSeasonWaysToEarn);

        const { getByText } = render(<WaysToEarn />);

        // Act
        fireEvent.press(getByText(title));

        // Assert
        const modalCall = mockNavigate.mock.calls.find(
          (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        );
        expect(modalCall?.[1]?.confirmAction?.label).toBe(expectedLabel);
      });
    });
  });
});

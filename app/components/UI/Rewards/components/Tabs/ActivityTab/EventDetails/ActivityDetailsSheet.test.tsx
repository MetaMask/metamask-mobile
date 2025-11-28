import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  ActivityDetailsSheet,
  openActivityDetailsSheet,
} from './ActivityDetailsSheet';
import { ButtonVariant } from '@metamask/design-system-react-native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalType } from '../../../RewardsBottomSheetModal';
import TEST_ADDRESS from '../../../../../../../constants/address';
import {
  PointsEventDto,
  SeasonActivityTypeDto,
} from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { AvatarAccountType } from '../../../../../../../component-library/components/Avatars/Avatar';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock i18n strings
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const t: Record<string, string> = {
      'navigation.close': 'Close',
      'rewards.events.details': 'Details',
      'rewards.events.date': 'Date',
      'rewards.events.account': 'Account',
      'rewards.events.points': 'Points',
      'rewards.events.points_base': 'Base',
      'rewards.events.points_boost': 'Boost',
      'rewards.events.points_total': 'Total',
      'rewards.events.description': 'Description',
      'rewards.events.for_deposit_period': 'For deposit period',
    };
    return t[key] || key;
  }),
}));

// Mock format utils
jest.mock('../../../../utils/formatUtils', () => ({
  formatRewardsDate: jest.fn(() => 'Sep 9, 2025'),
  formatNumber: jest.fn((n: number) => n.toString()),
  formatRewardsMusdDepositPayloadDate: jest.fn(
    (isoDate: string | undefined) => {
      // Mock implementation that matches the real implementation behavior
      if (
        !isoDate ||
        typeof isoDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)
      ) {
        return null;
      }
      const date = new Date(`${isoDate}T00:00:00Z`);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    },
  ),
  resolveTemplate: jest.fn((template: string, values: Record<string, string>) =>
    template.replace(/\$\{(\w+)\}/g, (match, placeholder) => {
      const value = values[placeholder as keyof typeof values];
      return value !== undefined ? String(value) : match;
    }),
  ),
}));

// Mock eventDetailsUtils
jest.mock('../../../../utils/eventDetailsUtils', () => ({
  getEventDetails: jest.fn(() => ({
    title: 'Event Details',
    subtitle: 'Subtitle',
    icon: null,
  })),
  formatSwapDetails: jest.fn(() => '1 ETH to 1 USDC'),
  formatAssetAmount: jest.fn((amount: string, decimals: number) => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
  }),
}));

// Mock SVG
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'SvgMock',
);

describe('ActivityDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);
  });

  const mockActivityTypes: SeasonActivityTypeDto[] = [
    {
      type: 'SWAP',
      title: 'Swap',
      description: 'Swap desc',
      icon: 'SwapVertical',
    },
    {
      type: 'CARD',
      title: 'Card spend',
      description: 'Spend',
      icon: 'Card',
    },
    {
      type: 'BRIDGE',
      title: 'Bridge',
      description: 'Bridge details',
      icon: 'ArrowRight',
    },
  ];

  const baseEvent: PointsEventDto = {
    id: 'test-id',
    timestamp: new Date('2025-09-09T09:09:33.000Z'),
    type: 'SWAP',
    payload: null,
    value: 1000,
    bonus: { bonusPoints: 250, bips: 0, bonuses: [] },
    accountAddress: TEST_ADDRESS,
    updatedAt: new Date('2025-09-09T09:09:33.000Z'),
  } as unknown as PointsEventDto;

  describe('component rendering', () => {
    it('renders SwapEventDetails for SWAP event type', () => {
      const swapEvent: Extract<PointsEventDto, { type: 'SWAP' }> = {
        ...baseEvent,
        type: 'SWAP',
        payload: {
          srcAsset: {
            amount: '1000000000000000000',
            decimals: 18,
            symbol: 'ETH',
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            amount: '1000000',
            decimals: 6,
            symbol: 'USDC',
            type: 'eip155:1/erc20:0xa0b8...e48',
          },
        },
      };

      render(
        <ActivityDetailsSheet
          event={swapEvent}
          accountName="Primary"
          activityTypes={mockActivityTypes}
        />,
      );

      // Verify GenericEventDetails content is rendered (base component)
      expect(screen.getByText('Details')).toBeTruthy();
      // Verify SwapEventDetails specific content
      expect(screen.getByText('Asset')).toBeTruthy();
      expect(screen.getByText('1 ETH to 1 USDC')).toBeTruthy();
    });

    it('renders CardEventDetails for CARD event type', () => {
      const cardEvent: Extract<PointsEventDto, { type: 'CARD' }> = {
        ...baseEvent,
        type: 'CARD',
        payload: {
          asset: {
            amount: '43250000',
            type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          txHash: '0xabc123def456789012345678901234567890abcd',
        },
      };

      render(
        <ActivityDetailsSheet
          event={cardEvent}
          accountName="Primary"
          activityTypes={mockActivityTypes}
        />,
      );

      // Verify GenericEventDetails content is rendered (base component)
      expect(screen.getByText('Details')).toBeTruthy();
      // Verify CardEventDetails specific content
      expect(screen.getByText('Amount')).toBeTruthy();
      expect(screen.getByText('43.25 USDC')).toBeTruthy();
    });

    it('renders MusdDepositEventDetails for MUSD_DEPOSIT event type', () => {
      const musdDepositEvent: Extract<
        PointsEventDto,
        { type: 'MUSD_DEPOSIT' }
      > = {
        ...baseEvent,
        type: 'MUSD_DEPOSIT',
        payload: {
          date: '2025-11-11',
        },
      };

      render(
        <ActivityDetailsSheet
          event={musdDepositEvent}
          accountName="Primary"
          activityTypes={mockActivityTypes}
        />,
      );

      // Verify GenericEventDetails content is rendered (base component)
      expect(screen.getByText('Details')).toBeTruthy();
      // Verify MusdDepositEventDetails specific content
      expect(screen.getByText('For deposit period')).toBeTruthy();
      expect(screen.getByText('Nov 11, 2025')).toBeTruthy();
    });

    it('renders GenericEventDetails with extra description for unspecified type when payload exists', () => {
      const genericEvent: PointsEventDto = {
        ...baseEvent,
        type: 'BRIDGE' as never,
        payload: { txHash: '0xabc123' } as unknown as PointsEventDto['payload'],
      };

      const activityTypesWithTemplate: SeasonActivityTypeDto[] = [
        {
          type: 'BRIDGE',
          title: 'Bridge',
          description: 'Tx: ${txHash}',
          icon: 'ArrowRight',
        },
      ];

      render(
        <ActivityDetailsSheet
          event={genericEvent}
          accountName="Primary"
          activityTypes={activityTypesWithTemplate}
        />,
      );

      // Verify GenericEventDetails content is rendered
      expect(screen.getByText('Details')).toBeTruthy();
      expect(screen.getByText('Points')).toBeTruthy();
      expect(screen.getByText('Date')).toBeTruthy();
      // Description row label and resolved template
      expect(screen.getByText('Description')).toBeTruthy();
      expect(screen.getByText('Tx: 0xabc123')).toBeTruthy();
    });

    it('renders GenericEventDetails without extra description when payload is null', () => {
      const genericEventNoPayload: PointsEventDto = {
        ...baseEvent,
        type: 'BRIDGE' as never,
        payload: null,
      };

      const activityTypesTemplate: SeasonActivityTypeDto[] = [
        {
          type: 'BRIDGE',
          title: 'Bridge',
          description: 'Tx: ${txHash}',
          icon: 'ArrowRight',
        },
      ];

      render(
        <ActivityDetailsSheet
          event={genericEventNoPayload}
          accountName="Primary"
          activityTypes={activityTypesTemplate}
        />,
      );

      // Verify GenericEventDetails content is rendered
      expect(screen.getByText('Details')).toBeTruthy();
      expect(screen.getByText('Points')).toBeTruthy();
      expect(screen.getByText('Date')).toBeTruthy();
      // No Description row since payload is null
      expect(screen.queryByText('Description')).toBeNull();
      expect(screen.queryByText('Tx: 0xabc123')).toBeNull();
    });
  });

  describe('openActivityDetailsSheet', () => {
    it('navigates to rewards bottom sheet modal with correct parameters', () => {
      const mockNavigation = useNavigation();
      const testEvent: PointsEventDto = {
        ...baseEvent,
        type: 'SWAP',
        payload: {
          srcAsset: {
            amount: '1000000000000000000',
            decimals: 18,
            symbol: 'ETH',
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            amount: '1000000',
            decimals: 6,
            symbol: 'USDC',
            type: 'eip155:1/erc20:0xa0b8...e48',
          },
        },
      };

      openActivityDetailsSheet(mockNavigation, {
        event: testEvent,
        activityTypes: mockActivityTypes,
        accountName: 'Test Account',
      });

      // Verify navigation was called with correct route
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: 'Event Details',
          type: ModalType.Confirmation,
          showIcon: false,
          showCancelButton: false,
          confirmAction: expect.objectContaining({
            label: 'Close',
            variant: ButtonVariant.Secondary,
          }),
        }),
      );
    });

    it('uses custom confirmAction when provided', () => {
      const mockNavigation = useNavigation();
      const testEvent: PointsEventDto = {
        ...baseEvent,
        type: 'CARD',
        payload: {
          asset: {
            amount: '128500000',
            type: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          txHash: '0xdef789abc012345678901234567890abcdef1234',
        },
      };
      const customAction = {
        label: 'Custom Action',
        onPress: jest.fn(),
        variant: ButtonVariant.Primary,
      };

      openActivityDetailsSheet(mockNavigation, {
        event: testEvent,
        accountName: 'Test Account',
        confirmAction: customAction,
        activityTypes: mockActivityTypes,
      });

      // Verify custom action is used
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          confirmAction: customAction,
        }),
      );
    });

    it('passes account name to ActivityDetailsSheet component', () => {
      const mockNavigation = useNavigation();
      const testEvent: PointsEventDto = {
        ...baseEvent,
        type: 'SWAP',
        payload: {
          srcAsset: {
            amount: '1000000000000000000',
            decimals: 18,
            symbol: 'ETH',
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            amount: '1000000',
            decimals: 6,
            symbol: 'USDC',
            type: 'eip155:1/erc20:0xa0b8...e48',
          },
        },
      };

      openActivityDetailsSheet(mockNavigation, {
        event: testEvent,
        accountName: 'My Custom Account',
        activityTypes: mockActivityTypes,
      });

      // Get the description prop which is the ActivityDetailsSheet component
      const callArgs = mockNavigate.mock.calls[0][1];
      expect(callArgs.description).toBeTruthy();

      // Verify the component can be rendered (checks it's a valid React element)
      const { description } = callArgs;
      render(description);
      expect(screen.getByText('Details')).toBeTruthy();
    });

    it('handles undefined accountName', () => {
      const mockNavigation = useNavigation();
      const testEvent: PointsEventDto = {
        ...baseEvent,
        type: 'SWAP',
        payload: {
          srcAsset: {
            amount: '1000000000000000000',
            decimals: 18,
            symbol: 'ETH',
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            amount: '1000000',
            decimals: 6,
            symbol: 'USDC',
            type: 'eip155:1/erc20:0xa0b8...e48',
          },
        },
      };

      // Should not throw when accountName is undefined
      expect(() => {
        openActivityDetailsSheet(mockNavigation, {
          event: testEvent,
          activityTypes: mockActivityTypes,
        });
      }).not.toThrow();

      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import VipPointsSection, {
  VIP_POINTS_SECTION_TEST_IDS,
} from './VipPointsSection';
import type { VipTierDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

const mockTwColor = jest.fn(
  (name: string) =>
    (name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)') as
      | string
      | undefined,
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: unknown[]) => args,
    color: (name: string) => mockTwColor(name),
  }),
}));

jest.mock('react-native-svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Stub = (props: { testID?: string }) =>
    ReactActual.createElement(View, props);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.equity_rebate_header' && params) {
      return `Equity rebate: ${params.value}%`;
    }
    if (key === 'rewards.vip.equity_rebate_next_tier' && params) {
      return `↑ ${params.value}% at next tier`;
    }
    if (key === 'rewards.vip.equity_rebate_top_tier') {
      return 'Top tier reached.';
    }
    return key;
  },
}));

const makeTier = (overrides: Partial<VipTierDto> = {}): VipTierDto => ({
  id: 't6',
  name: 'Gold Fox VIP 6',
  tier: 6,
  pointsRequirement: 3_000_000,
  swapsBps: 8,
  perpsBps: 3,
  revenueShareBps: 3000,
  equityRebateBps: 3000,
  referralCarryoverBps: 3000,
  status: 'current',
  ...overrides,
});

describe('VipPointsSection', () => {
  const baseProps = {
    title: 'Points',
    subtitle: 'Earn VIP allocations',
    description: 'Track your VIP allocation progress.',
  };

  beforeEach(() => {
    mockTwColor.mockImplementation((name: string) =>
      name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)',
    );
  });

  describe('pre-qualification state (no currentTier or equityRebateBps === 0)', () => {
    it('renders the title, subtitle, and a radial label of the form "earned/max" in compact notation', () => {
      const { getByTestId, getByText } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{
            earned: 24_400_000,
            max: 100_000_000,
            percent: 24.4,
          }}
        />,
      );

      expect(getByText('Points')).toBeOnTheScreen();
      expect(getByText('Earn VIP allocations')).toBeOnTheScreen();
      const radialLabel = getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL);
      expect(radialLabel).toHaveTextContent(/24\.4M/);
      expect(radialLabel).toHaveTextContent(/\/100M/);
    });

    it('clamps the dash offset for out-of-range percent values', () => {
      const { getByTestId } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{ earned: 0, max: 1, percent: 200 }}
        />,
      );
      expect(getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL)).toBeOnTheScreen();
    });

    it('falls back to "transparent" radial colors when the tailwind preset returns nothing for either token', () => {
      mockTwColor.mockReturnValue(undefined);

      const { getByTestId } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{ earned: 0, max: 1, percent: 50 }}
        />,
      );

      expect(getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL)).toBeOnTheScreen();
    });

    it('keeps the pre-qualification copy when currentTier.equityRebateBps === 0', () => {
      const tier = makeTier({ equityRebateBps: 0 });
      const { getByText, queryByText } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{
            earned: 24_400_000,
            max: 100_000_000,
            percent: 24.4,
          }}
          currentTier={tier}
          nextTier={tier}
        />,
      );

      expect(getByText('Points')).toBeOnTheScreen();
      expect(getByText('Earn VIP allocations')).toBeOnTheScreen();
      expect(queryByText(/Equity rebate:/)).toBeNull();
    });
  });

  describe('qualified at T6 (rebate active, more increments above)', () => {
    it('shows the current rebate header, "↑ next tier" sub-copy, and rolling progress to the next tier', () => {
      const currentTier = makeTier({
        tier: 6,
        pointsRequirement: 3_000_000,
        equityRebateBps: 3000,
      });
      const nextTier = makeTier({
        id: 't7',
        name: 'Gold Fox VIP 7',
        tier: 7,
        pointsRequirement: 6_000_000,
        equityRebateBps: 4000,
      });
      const { getByTestId, getByText } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{
            earned: 3_500_000,
            max: 100_000_000,
            percent: 3.5,
          }}
          currentTier={currentTier}
          nextTier={nextTier}
        />,
      );

      expect(getByText('Equity rebate: 30%')).toBeOnTheScreen();
      expect(getByText('↑ 40% at next tier')).toBeOnTheScreen();
      // Ring label denominator is now the next tier's pointsRequirement,
      // not the pre-qual 100M.
      const radialLabel = getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL);
      expect(radialLabel).toHaveTextContent(/3\.5M/);
      expect(radialLabel).toHaveTextContent(/\/6M/);
    });
  });

  describe('qualified at T7 (one increment above)', () => {
    it('shows the T7 rebate header and points to T8 as the next tier', () => {
      const currentTier = makeTier({
        id: 't7',
        name: 'Gold Fox VIP 7',
        tier: 7,
        pointsRequirement: 6_000_000,
        equityRebateBps: 4000,
      });
      const nextTier = makeTier({
        id: 't8',
        name: 'Gold Fox VIP 8',
        tier: 8,
        pointsRequirement: 16_000_000,
        equityRebateBps: 5000,
      });
      const { getByText } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{
            earned: 8_000_000,
            max: 100_000_000,
            percent: 8,
          }}
          currentTier={currentTier}
          nextTier={nextTier}
        />,
      );

      expect(getByText('Equity rebate: 40%')).toBeOnTheScreen();
      expect(getByText('↑ 50% at next tier')).toBeOnTheScreen();
    });
  });

  describe('qualified at T8 (top tier)', () => {
    it('shows the top-tier copy and drops the radial denominator', () => {
      const tier = makeTier({
        id: 't8',
        name: 'Gold Fox VIP 8',
        tier: 8,
        pointsRequirement: 16_000_000,
        equityRebateBps: 5000,
      });
      const { getByText, getByTestId, queryByText } = render(
        <VipPointsSection
          {...baseProps}
          pointsAllocation={{
            earned: 25_000_000,
            max: 100_000_000,
            percent: 25,
          }}
          currentTier={tier}
          nextTier={tier}
        />,
      );

      expect(getByText('Equity rebate: 50%')).toBeOnTheScreen();
      expect(getByText('Top tier reached.')).toBeOnTheScreen();
      // No "↑ X% at next tier" copy when current === next.
      expect(queryByText(/at next tier/)).toBeNull();
      // Denominator dropped on the radial label — only the earned compact
      // number remains.
      const radialLabel = getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL);
      expect(radialLabel).toHaveTextContent(/25M/);
      expect(radialLabel).not.toHaveTextContent(/\//);
    });
  });
});

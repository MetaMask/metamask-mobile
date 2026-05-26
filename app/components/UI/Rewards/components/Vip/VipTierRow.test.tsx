import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import VipTierRow, { VIP_TIER_ROW_TEST_IDS } from './VipTierRow';
import {
  VIP_GOLD_BACKGROUND_MUTED,
  VIP_GOLD_TIER_GRADIENT_COLORS,
} from './Vip.constants';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.tier_thresholds' && params) {
      return `${params.points} points`;
    }
    if (key === 'rewards.vip.bps_value' && params) {
      return `${params.bps} bps`;
    }
    const t: Record<string, string> = {
      'rewards.vip.revenue_share_label': 'Revenue share',
      'rewards.vip.swap_fees_label': 'Swap fees',
      'rewards.vip.perps_fees_label': 'Perps fees',
      'rewards.vip.referral_points_label': 'Referral points',
    };
    return t[key] ?? key;
  },
}));

const baseTier = {
  id: 'gold-fox-vip-3',
  name: 'Gold Fox 3',
  tier: 3,
  pointsRequirement: 750_000,
  revenueShareBps: 150,
  swapsBps: 15,
  perpsBps: 4,
  equityRebateBps: 0,
  referralCarryoverBps: 2000,
  status: 'current' as const,
};

describe('VipTierRow', () => {
  it('opens current tier details by default', () => {
    const { getByTestId } = render(<VipTierRow tier={baseTier} />);

    expect(
      getByTestId(`${VIP_TIER_ROW_TEST_IDS.DETAILS}-${baseTier.id}`),
    ).toBeOnTheScreen();
  });

  it('renders name, points threshold, and fees for a non-base tier', () => {
    const { getByText, getByTestId } = render(<VipTierRow tier={baseTier} />);

    expect(getByText('Gold Fox 3')).toBeOnTheScreen();
    expect(
      getByTestId(`${VIP_TIER_ROW_TEST_IDS.CONTAINER}-${baseTier.id}`),
    ).toHaveStyle({ backgroundColor: VIP_GOLD_BACKGROUND_MUTED });
    expect(
      getByTestId(VIP_TIER_ROW_TEST_IDS.CURRENT_TIER_GRADIENT).props.colors,
    ).toEqual(VIP_GOLD_TIER_GRADIENT_COLORS);
    expect(
      getByTestId(VIP_TIER_ROW_TEST_IDS.CURRENT_TIER_GRADIENT).props.start,
    ).toEqual({ x: 0, y: 0 });
    expect(
      getByTestId(VIP_TIER_ROW_TEST_IDS.CURRENT_TIER_GRADIENT).props.end,
    ).toEqual({ x: 0, y: 1 });
    expect(getByTestId(VIP_TIER_ROW_TEST_IDS.THRESHOLDS)).toHaveTextContent(
      /750k points/,
    );
    expect(getByText('Revenue share')).toBeOnTheScreen();
    expect(getByText('Swap fees')).toBeOnTheScreen();
    expect(getByText('Perps fees')).toBeOnTheScreen();
    expect(getByText('Referral points')).toBeOnTheScreen();
    expect(
      getByTestId(VIP_TIER_ROW_TEST_IDS.REVENUE_SHARE_FEE),
    ).toHaveTextContent(/1.5%/);
    expect(getByTestId(VIP_TIER_ROW_TEST_IDS.SWAPS_FEE)).toHaveTextContent(
      /15 bps/,
    );
    expect(getByTestId(VIP_TIER_ROW_TEST_IDS.PERPS_FEE)).toHaveTextContent(
      /4 bps/,
    );
    expect(
      getByTestId(VIP_TIER_ROW_TEST_IDS.REFERRAL_POINTS),
    ).toHaveTextContent(/20%/);
  });

  it('keeps the gradient mounted when collapse starts so opacity can animate', () => {
    const { getByTestId } = render(<VipTierRow tier={baseTier} />);

    fireEvent.press(
      getByTestId(`${VIP_TIER_ROW_TEST_IDS.HEADER}-${baseTier.id}`),
    );

    expect(
      getByTestId(VIP_TIER_ROW_TEST_IDS.CURRENT_TIER_GRADIENT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${VIP_TIER_ROW_TEST_IDS.CONTAINER}-${baseTier.id}`),
    ).toHaveStyle({ backgroundColor: VIP_GOLD_BACKGROUND_MUTED });
  });

  it('toggles tier details from the title row', () => {
    const tier = { ...baseTier, status: 'upcoming' as const };
    const { getByTestId, queryByTestId } = render(<VipTierRow tier={tier} />);

    expect(
      queryByTestId(`${VIP_TIER_ROW_TEST_IDS.DETAILS}-${tier.id}`),
    ).toBeNull();

    fireEvent.press(getByTestId(`${VIP_TIER_ROW_TEST_IDS.HEADER}-${tier.id}`));

    expect(
      getByTestId(`${VIP_TIER_ROW_TEST_IDS.DETAILS}-${tier.id}`),
    ).toBeOnTheScreen();
  });

  it('hides the thresholds row for tiers 0 and 1', () => {
    const { queryByTestId, rerender } = render(
      <VipTierRow
        tier={{
          ...baseTier,
          id: 'default',
          name: 'Default',
          tier: 0,
          pointsRequirement: 0,
          revenueShareBps: 0,
          status: 'completed',
        }}
      />,
    );
    expect(queryByTestId(VIP_TIER_ROW_TEST_IDS.THRESHOLDS)).toBeNull();

    rerender(
      <VipTierRow
        tier={{
          ...baseTier,
          id: 'gold-fox-vip-1',
          name: 'Gold Fox 1',
          tier: 1,
          pointsRequirement: 100_000,
          status: 'completed',
        }}
      />,
    );
    expect(queryByTestId(VIP_TIER_ROW_TEST_IDS.THRESHOLDS)).toBeNull();
  });
});

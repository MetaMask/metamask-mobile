import React from 'react';
import { render } from '@testing-library/react-native';
import VipTierRow, { VIP_TIER_ROW_TEST_IDS } from './VipTierRow';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.tier_thresholds' && params) {
      return `${params.swaps} Swaps • ${params.perps} Perps`;
    }
    if (key === 'rewards.vip.bps_value' && params) {
      return `${params.bps} bps`;
    }
    const t: Record<string, string> = {
      'rewards.vip.swaps_label': 'Swaps',
      'rewards.vip.perps_label': 'Perps',
    };
    return t[key] ?? key;
  },
}));

const baseTier = {
  id: 'gold-fox-vip-3',
  name: 'Gold Fox 3',
  tier: 3,
  swapsRequirementUsd: 7_000_000,
  perpsRequirementUsd: 35_000_000,
  revenueShareBps: 150,
  swapsBps: 15,
  perpsBps: 4,
  status: 'current' as const,
};

describe('VipTierRow', () => {
  it('renders name, weighted thresholds, and fees for a non-base tier', () => {
    const { getByText, getByTestId } = render(<VipTierRow tier={baseTier} />);

    expect(getByText('Gold Fox 3')).toBeOnTheScreen();
    expect(getByTestId(VIP_TIER_ROW_TEST_IDS.THRESHOLDS)).toHaveTextContent(
      /\$7M Swaps • \$35M Perps/,
    );
    expect(getByTestId(VIP_TIER_ROW_TEST_IDS.SWAPS_FEE)).toHaveTextContent(
      /15 bps/,
    );
    expect(getByTestId(VIP_TIER_ROW_TEST_IDS.PERPS_FEE)).toHaveTextContent(
      /4 bps/,
    );
  });

  it('hides the thresholds row for the base tier (tier 0)', () => {
    const { queryByTestId } = render(
      <VipTierRow
        tier={{
          ...baseTier,
          id: 'default',
          name: 'Default',
          tier: 0,
          swapsRequirementUsd: 0,
          perpsRequirementUsd: 0,
          revenueShareBps: 0,
          status: 'completed',
        }}
      />,
    );
    expect(queryByTestId(VIP_TIER_ROW_TEST_IDS.THRESHOLDS)).toBeNull();
  });
});

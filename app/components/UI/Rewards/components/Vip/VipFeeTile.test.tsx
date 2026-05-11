import React from 'react';
import { render } from '@testing-library/react-native';
import VipFeeTile, { VIP_FEE_TILE_TEST_IDS } from './VipFeeTile';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.next_tier_bps' && params) {
      return `↓ ${params.bps} bps next tier`;
    }
    if (key === 'rewards.vip.bps_unit') {
      return 'bps';
    }
    return key;
  },
}));

describe('VipFeeTile', () => {
  it('renders the label, current bps value, bps unit, and next-tier delta', () => {
    const { getByText, getByTestId } = render(
      <VipFeeTile label="Swaps fee" currentBps={15} nextTierBps={12} />,
    );

    expect(getByText('Swaps fee')).toBeOnTheScreen();
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.CURRENT)).toHaveTextContent(/15/);
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.CURRENT)).toHaveTextContent(/bps/);
    expect(getByTestId(VIP_FEE_TILE_TEST_IDS.NEXT)).toHaveTextContent(
      /↓ 12 bps next tier/,
    );
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId } = render(
      <VipFeeTile
        label="Perps fee"
        currentBps={4}
        nextTierBps={3}
        testID="custom-tile"
      />,
    );
    expect(getByTestId('custom-tile')).toBeOnTheScreen();
  });
});

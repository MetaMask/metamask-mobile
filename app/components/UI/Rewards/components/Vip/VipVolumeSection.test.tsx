import React from 'react';
import { render } from '@testing-library/react-native';
import VipVolumeSection, {
  VIP_VOLUME_SECTION_TEST_IDS,
} from './VipVolumeSection';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.on_track_days' && params) {
      return `On track to reach the next tier in ${params.count} days`;
    }
    if (key === 'rewards.vip.volume_section_title') return 'Volume';
    if (key === 'rewards.vip.swaps_label') return 'Swaps';
    if (key === 'rewards.vip.perps_label') return 'Perps';
    return key;
  },
}));

describe('VipVolumeSection', () => {
  const props = {
    period: {
      start: '2026-04-11T00:00:00.000Z',
      end: '2026-05-11T23:59:59.999Z',
    },
    volume: { swapsUsd: 4_100_000, perpsUsd: 2_300_000 },
    daysToNextTier: 4,
  };

  it('renders the period, swaps/perps amounts, and the on-track copy', () => {
    const { getByTestId, getByText } = render(<VipVolumeSection {...props} />);

    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERIOD)).toHaveTextContent(
      /Apr 11 - May 11/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS)).toHaveTextContent(
      /\$4,100,000/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERPS)).toHaveTextContent(
      /\$2,300,000/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.ON_TRACK)).toHaveTextContent(
      /On track to reach the next tier in 4 days/,
    );
    expect(getByText('Volume')).toBeOnTheScreen();
  });
});

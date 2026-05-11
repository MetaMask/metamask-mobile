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
  strings: (key: string) => {
    if (key === 'rewards.vip.swaps_label') return 'Swaps';
    if (key === 'rewards.vip.perps_label') return 'Perps';
    return key;
  },
}));

describe('VipVolumeSection', () => {
  const props = {
    volume: { swapsUsd: 4_100_000, perpsUsd: 2_300_000 },
    title: 'Volume',
    period: 'Apr 11 - May 11',
    status: 'On track to reach the next tier in 4 days',
  };

  it('renders the title, period, swaps/perps amounts, and the status copy passed in by the parent', () => {
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

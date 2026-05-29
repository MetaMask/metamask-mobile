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

describe('VipVolumeSection', () => {
  const props = {
    volume: {
      swapsUsd: 4_100_000,
      perpsUsd: 2_300_000,
      points: 24_400_000,
      pointsFromReferrals: 500_000,
      referrals: 2,
      referralsCap: 10,
    },
    title: 'Volume',
    period: 'Apr 11 - May 11',
    labels: {
      points: 'Points',
      swapsVolume: 'Swaps Volume',
      pointsFromReferrals: 'Points from Referrals',
      perpsVolume: 'Perps Volume',
      vipReferrals: 'VIP Referrals',
    },
  };

  it('renders the title, period, and volume metrics', () => {
    const { getByTestId, getByText } = render(<VipVolumeSection {...props} />);

    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERIOD)).toHaveTextContent(
      /Apr 11 - May 11/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS)).toHaveTextContent(
      /\$4,100,000/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS)).toHaveTextContent(
      /Swaps Volume/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERPS)).toHaveTextContent(
      /\$2,300,000/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERPS)).toHaveTextContent(
      /Perps Volume/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS)).toHaveTextContent(
      /24,400,000/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS)).toHaveTextContent(
      /Points/,
    );
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS_FROM_REFERRALS),
    ).toHaveTextContent(/500,000/);
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS_FROM_REFERRALS),
    ).toHaveTextContent(/Points from Referrals/);
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.REFERRALS),
    ).toHaveTextContent(/2\/10/);
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.REFERRALS),
    ).toHaveTextContent(/VIP Referrals/);
    expect(getByText('Volume')).toBeOnTheScreen();
  });
});

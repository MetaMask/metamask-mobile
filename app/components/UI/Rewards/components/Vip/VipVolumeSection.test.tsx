import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import VipVolumeSection, {
  VIP_VOLUME_SECTION_TEST_IDS,
} from './VipVolumeSection';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    // Replace ButtonIcon with a lightweight stub so the test does not depend
    // on the full twrnc/reanimated rendering pipeline.
    ButtonIcon: ({
      onPress,
      testID,
      accessibilityLabel,
    }: {
      onPress?: () => void;
      testID?: string;
      accessibilityLabel?: string;
    }) =>
      ReactActual.createElement(Pressable, {
        testID,
        accessibilityLabel,
        onPress,
      }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

describe('VipVolumeSection', () => {
  const props = {
    volume: {
      swapsUsd: 1_234_567,
      perpsUsd: 9_876_543,
      points: 5_555_555,
      pointsFromReferrals: 111_111,
      referrals: 3,
      referralsCap: 7,
    },
    title: 'Volume',
    period: 'Feb 1 - Feb 28',
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
      /Feb 1 - Feb 28/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS)).toHaveTextContent(
      /\$1,234,567/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS)).toHaveTextContent(
      /Swaps Volume/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERPS)).toHaveTextContent(
      /\$9,876,543/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.PERPS)).toHaveTextContent(
      /Perps Volume/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS)).toHaveTextContent(
      /5,555,555/,
    );
    expect(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS)).toHaveTextContent(
      /Points/,
    );
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS_FROM_REFERRALS),
    ).toHaveTextContent(/111,111/);
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.POINTS_FROM_REFERRALS),
    ).toHaveTextContent(/Points from Referrals/);
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.REFERRALS),
    ).toHaveTextContent(/3\/7/);
    expect(
      getByTestId(VIP_VOLUME_SECTION_TEST_IDS.REFERRALS),
    ).toHaveTextContent(/VIP Referrals/);
    expect(getByText('Volume')).toBeOnTheScreen();
  });

  it('does not render the swaps volume help icon when no info handler is provided', () => {
    const { queryByTestId } = render(<VipVolumeSection {...props} />);

    expect(queryByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS_INFO)).toBeNull();
  });

  it('renders the swaps volume help icon and calls onSwapsVolumeInfoPress when pressed', () => {
    const onSwapsVolumeInfoPress = jest.fn();
    const { getByTestId } = render(
      <VipVolumeSection
        {...props}
        onSwapsVolumeInfoPress={onSwapsVolumeInfoPress}
      />,
    );

    fireEvent.press(getByTestId(VIP_VOLUME_SECTION_TEST_IDS.SWAPS_INFO));

    expect(onSwapsVolumeInfoPress).toHaveBeenCalledTimes(1);
  });
});

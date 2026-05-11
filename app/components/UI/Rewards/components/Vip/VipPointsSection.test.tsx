import React from 'react';
import { render } from '@testing-library/react-native';
import VipPointsSection, {
  VIP_POINTS_SECTION_TEST_IDS,
} from './VipPointsSection';

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

describe('VipPointsSection', () => {
  const baseProps = {
    title: 'Points',
    subtitle: 'Earn VIP allocations',
  };

  beforeEach(() => {
    mockTwColor.mockImplementation((name: string) =>
      name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)',
    );
  });

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
});

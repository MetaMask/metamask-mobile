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
  const { View: ReactNativeView } = jest.requireActual('react-native');
  const Stub = (props: { testID?: string }) =>
    ReactActual.createElement(ReactNativeView, props);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Circle: Stub,
  };
});

const baseProps: React.ComponentProps<typeof VipPointsSection> = {
  title: 'Points',
  equityLockedTitle: 'Locked allocation',
  equityLockedDescription: 'Keep earning to unlock equity.',
  equityUnlockedTitle: 'Unlocked allocation',
  equityUnlockedDescription: 'Your equity allocation is unlocked.',
  pointsAllocation: {
    earned: 24_400_000,
    threshold: 100_000_000,
    percent: 24.4,
  },
};

describe('VipPointsSection', () => {
  beforeEach(() => {
    mockTwColor.mockImplementation((name: string) =>
      name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)',
    );
  });

  it('renders locked equity copy when earned points are below the threshold', () => {
    const { getByTestId, getByText } = render(
      <VipPointsSection {...baseProps} />,
    );

    expect(getByText('Points')).toBeOnTheScreen();
    expect(getByText('Locked allocation')).toBeOnTheScreen();
    expect(getByText('Keep earning to unlock equity.')).toBeOnTheScreen();
    const radialLabel = getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL);
    expect(radialLabel).toHaveTextContent(/24\.4M/);
    expect(radialLabel).toHaveTextContent(/\/100M/);
  });

  it('renders unlocked equity copy when earned points meet the threshold', () => {
    const { getByTestId, getByText } = render(
      <VipPointsSection
        {...baseProps}
        pointsAllocation={{
          earned: 100_000_000,
          threshold: 100_000_000,
          percent: 100,
        }}
      />,
    );

    expect(getByText('Unlocked allocation')).toBeOnTheScreen();
    expect(getByText('Your equity allocation is unlocked.')).toBeOnTheScreen();
    const radialLabel = getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL);
    expect(radialLabel).toHaveTextContent(/100M/);
    expect(radialLabel).toHaveTextContent(/\/100M/);
  });

  it('keeps the radial label unclamped when earned points exceed the threshold', () => {
    const { getByTestId } = render(
      <VipPointsSection
        {...baseProps}
        pointsAllocation={{
          earned: 125_000_000,
          threshold: 100_000_000,
          percent: 125,
        }}
      />,
    );

    const radialLabel = getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL);
    expect(radialLabel).toHaveTextContent(/125M/);
    expect(radialLabel).toHaveTextContent(/\/100M/);
  });

  it('clamps the radial progress to a full circle when percent exceeds 100', () => {
    const { getByTestId } = render(
      <VipPointsSection
        {...baseProps}
        pointsAllocation={{
          earned: 125_000_000,
          threshold: 100_000_000,
          percent: 125,
        }}
      />,
    );

    expect(
      getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL_PROGRESS).props
        .strokeDashoffset,
    ).toBe(0);
  });

  it('falls back to transparent radial colors when the tailwind preset returns no token colors', () => {
    mockTwColor.mockReturnValue(undefined);

    const { getByTestId } = render(<VipPointsSection {...baseProps} />);

    expect(getByTestId(VIP_POINTS_SECTION_TEST_IDS.RADIAL)).toBeOnTheScreen();
  });
});

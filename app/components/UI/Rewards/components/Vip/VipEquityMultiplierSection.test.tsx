import React from 'react';
import { render } from '@testing-library/react-native';
import VipEquityMultiplierSection, {
  VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS,
} from './VipEquityMultiplierSection';
import { useVipEquityMultiplier } from '../../hooks/useVipEquityMultiplier';

jest.mock('../../hooks/useVipEquityMultiplier', () => ({
  useVipEquityMultiplier: jest.fn(),
}));

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

const mockUseVipEquityMultiplier =
  useVipEquityMultiplier as jest.MockedFunction<typeof useVipEquityMultiplier>;

const baseData = {
  available: true as const,
  multiplier: '1.0889',
  eligible: true,
  progressPercent: 44.4,
  tierNumber: 6,
  tierName: 'VIP 6',
  capUsd: '10000000',
  computedAt: '2026-08-04T00:00:00.000Z',
  localizedText: {
    title: 'Estimated equity multiplier',
    eligibleDescription: '1.09x active. Accumulate more mUSD to increase.',
    ineligibleDescription: 'Not active. Accumulate over $1M mUSD to activate.',
  },
};

describe('VipEquityMultiplierSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTwColor.mockImplementation((name: string) =>
      name === 'success-default' ? 'rgb(0,200,80)' : 'rgb(220,220,220)',
    );
  });

  it('renders nothing when shouldRender is false', () => {
    mockUseVipEquityMultiplier.mockReturnValue({
      shouldRender: false,
      data: null,
      holdingsUsd: undefined,
    });
    const { queryByTestId } = render(<VipEquityMultiplierSection />);
    expect(
      queryByTestId(VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.CONTAINER),
    ).toBeNull();
  });

  it('renders title, eligible description, and radial label from local holdings and capUsd', () => {
    mockUseVipEquityMultiplier.mockReturnValue({
      shouldRender: true,
      data: baseData,
      holdingsUsd: '5000000',
    });

    const { getByTestId, getByText } = render(<VipEquityMultiplierSection />);

    expect(
      getByTestId(VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.TITLE),
    ).toHaveTextContent('Estimated equity multiplier');
    expect(
      getByText('1.09x active. Accumulate more mUSD to increase.'),
    ).toBeOnTheScreen();

    const radialLabel = getByTestId(
      VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_LABEL,
    );
    expect(radialLabel).toHaveTextContent(/\$5M/);
    expect(radialLabel).toHaveTextContent(/\/\$10M/);
    expect(
      getByTestId(VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_PROGRESS),
    ).toBeOnTheScreen();
  });

  it('renders ineligible description when eligible is false', () => {
    mockUseVipEquityMultiplier.mockReturnValue({
      shouldRender: true,
      data: {
        ...baseData,
        eligible: false,
        progressPercent: 0,
      },
      holdingsUsd: '0',
    });

    const { getByText } = render(<VipEquityMultiplierSection />);
    expect(
      getByText('Not active. Accumulate over $1M mUSD to activate.'),
    ).toBeOnTheScreen();
  });

  it('formats holdings and cap as compact USD with at most two fraction digits', () => {
    mockUseVipEquityMultiplier.mockReturnValue({
      shouldRender: true,
      data: {
        ...baseData,
        capUsd: '10555555',
      },
      holdingsUsd: '5555555',
    });

    const { getByTestId } = render(<VipEquityMultiplierSection />);
    const radialLabel = getByTestId(
      VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_LABEL,
    );
    expect(radialLabel).toHaveTextContent(/\$5\.56M/);
    expect(radialLabel).toHaveTextContent(/\/\$10\.56M/);
  });

  it('treats non-numeric holdingsUsd and capUsd as zero in the radial label', () => {
    mockUseVipEquityMultiplier.mockReturnValue({
      shouldRender: true,
      data: {
        ...baseData,
        capUsd: 'not-a-number',
      },
      holdingsUsd: 'also-invalid',
    });

    const { getByTestId } = render(<VipEquityMultiplierSection />);
    const radialLabel = getByTestId(
      VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_LABEL,
    );
    expect(radialLabel).toHaveTextContent(/^\$0/);
    expect(radialLabel).toHaveTextContent(/\/\$0$/);
  });

  it('uses server progressPercent for the radial fill', () => {
    mockUseVipEquityMultiplier.mockReturnValue({
      shouldRender: true,
      data: {
        ...baseData,
        progressPercent: 44.4,
      },
      holdingsUsd: '5000000',
    });

    const { getByTestId } = render(<VipEquityMultiplierSection />);
    const RADIAL_SIZE = 96;
    const STROKE_WIDTH = 8;
    const RADIUS = (RADIAL_SIZE - STROKE_WIDTH) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    const expectedOffset = CIRCUMFERENCE * (1 - 44.4 / 100);

    expect(
      getByTestId(VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_PROGRESS).props
        .strokeDashoffset,
    ).toBeCloseTo(expectedOffset, 5);
  });
});

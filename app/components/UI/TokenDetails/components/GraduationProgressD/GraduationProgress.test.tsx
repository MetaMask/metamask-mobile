import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ImpactMoment } from '../../../../../util/haptics';
import type { TokenAssetRecord } from '../../queries/tokenAssetQuery';
import { TokenDetailsIds } from '../../testIds';
import { GraduationProgress } from './GraduationProgress';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    Easing: Reanimated.Easing,
    useReducedMotion: jest.fn(() => false),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);

const mockFireImpact = jest.fn();

jest.mock('../../../../../util/haptics', () => ({
  ...jest.requireActual<typeof import('../../../../../util/haptics')>(
    '../../../../../util/haptics',
  ),
  useHaptics: () => ({
    fireImpact: mockFireImpact,
    playImpact: jest.fn(),
    playSuccessNotification: jest.fn(),
    playErrorNotification: jest.fn(),
    playWarningNotification: jest.fn(),
    playSelection: jest.fn(),
  }),
}));

const asset = ({
  launchpad = 'pumpfun',
  ...launchpadDataOverrides
}: {
  graduationPercent?: number | null;
  graduationStage?: string | null;
  launchpad?: string | null;
} = {}): TokenAssetRecord => ({
  assetId: 'sol/MOON',
  symbol: 'MOON',
  name: 'Moonshot',
  decimals: 6,
  rwaData: null,
  marketData: null,
  holders: null,
  launchpad,
  launchpadData: {
    protocol: 'pumpfun',
    deployer: null,
    launchedAt: 1_700_000_000,
    description: null,
    bondingCurve: null,
    graduationPercent: 94,
    graduationStage: 'bonding',
    devHeldPercent: null,
    insiderHeldPercent: null,
    sniperHeldPercent: null,
    holdersCount: null,
    top10HeldPercent: null,
    ...launchpadDataOverrides,
  },
});

describe('GraduationProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the bonding module with tag, percent, cells, and money copy', () => {
    const { getByTestId } = render(<GraduationProgress asset={asset()} />);

    expect(getByTestId(TokenDetailsIds.graduation.module)).toBeDefined();
    expect(getByTestId(TokenDetailsIds.graduation.stageTag)).toHaveTextContent(
      'Bonding',
    );
    expect(getByTestId(TokenDetailsIds.graduation.percent)).toHaveTextContent(
      '94%',
    );

    for (let index = 0; index < 10; index += 1) {
      expect(getByTestId(TokenDetailsIds.graduation.cell(index))).toBeDefined();
    }

    expect(getByTestId(TokenDetailsIds.graduation.moneyRow)).toHaveTextContent(
      '$64.9K raised · $4.1K to graduation',
    );
  });

  it('exposes progressbar semantics with the current percent', () => {
    const { getByTestId } = render(<GraduationProgress asset={asset()} />);

    const progressModule = getByTestId(TokenDetailsIds.graduation.module);

    expect(progressModule.props.accessibilityRole).toBe('progressbar');
    expect(progressModule.props.accessibilityValue).toStrictEqual({
      min: 0,
      max: 100,
      now: 94,
    });
    expect(progressModule.props.accessibilityLabel).toBe(
      'Bonding curve progress. 94 percent bonded. $64.9K raised. $4.1K to graduation.',
    );
  });

  it('collapses a created token to the compact percent-only layout', () => {
    const { getByTestId, queryByTestId } = render(
      <GraduationProgress
        asset={asset({
          graduationStage: 'created',
          graduationPercent: 24,
        })}
      />,
    );

    expect(getByTestId(TokenDetailsIds.graduation.stageTag)).toHaveTextContent(
      'New',
    );
    expect(getByTestId(TokenDetailsIds.graduation.percent)).toHaveTextContent(
      '24%',
    );
    expect(queryByTestId(TokenDetailsIds.graduation.cells)).toBeNull();
    expect(getByTestId(TokenDetailsIds.graduation.moneyRow)).toHaveTextContent(
      'to graduation',
    );
  });

  it('describes a created token with percent-only accessibility copy', () => {
    const { getByTestId } = render(
      <GraduationProgress
        asset={asset({
          graduationStage: 'created',
          graduationPercent: 24,
        })}
      />,
    );

    expect(
      getByTestId(TokenDetailsIds.graduation.module).props.accessibilityLabel,
    ).toBe('Graduation progress. 24 percent to graduation.');
  });

  it.each([
    ['no launchpad data', null],
    ['a migrated token', asset({ graduationStage: 'migrated' })],
    ['an established token', asset({ graduationStage: 'established' })],
    ['a bonding token at 100 percent', asset({ graduationPercent: 100 })],
    [
      'a token without a graduation percent',
      asset({ graduationPercent: null }),
    ],
  ])('renders nothing for %p', (_name, assetValue) => {
    const { queryByTestId } = render(<GraduationProgress asset={assetValue} />);

    expect(queryByTestId(TokenDetailsIds.graduation.module)).toBeNull();
  });

  it('ticks the frontier haptic once the mount fill lands', () => {
    mockUseReducedMotion.mockReturnValue(false);

    render(<GraduationProgress asset={asset()} />);

    expect(mockFireImpact).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(mockFireImpact).toHaveBeenCalledTimes(1);
    expect(mockFireImpact).toHaveBeenCalledWith(ImpactMoment.SliderTick);
  });

  it('ticks once when a live update completes another cell', () => {
    mockUseReducedMotion.mockReturnValue(false);

    const { rerender } = render(
      <GraduationProgress asset={asset({ graduationPercent: 24 })} />,
    );

    rerender(<GraduationProgress asset={asset({ graduationPercent: 34 })} />);

    expect(mockFireImpact).toHaveBeenCalledTimes(1);
    expect(mockFireImpact).toHaveBeenCalledWith(ImpactMoment.SliderTick);
  });

  it('skips haptics under reduced motion', () => {
    render(<GraduationProgress asset={asset()} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockFireImpact).not.toHaveBeenCalled();
  });
});

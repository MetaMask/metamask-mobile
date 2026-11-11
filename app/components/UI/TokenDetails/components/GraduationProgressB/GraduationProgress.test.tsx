import React from 'react';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { mockTheme } from '../../../../../util/theme';
import {
  GraduationProgress,
  GraduationProgressDetail,
} from './GraduationProgress';
import { GraduationProgressSelectors } from './GraduationProgress.testIds';
import type { GraduationProgressViewModel } from './graduationViewModel';

jest.mock('react-native-linear-gradient', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return ({ testID, colors }: { testID?: string; colors?: string[] }) => (
    <View testID={testID} {...{ colors }} />
  );
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);

const mergedStyle = (style: unknown): Record<string, unknown> => {
  const entries = Array.isArray(style) ? style : [style];
  return Object.assign({}, ...entries);
};

const BONDING: GraduationProgressViewModel = {
  stage: 'bonding',
  percent: 94.2,
  raisedUsd: 64998.00000000001,
  remainingUsd: 4001.9999999999977,
};

const NEW: GraduationProgressViewModel = {
  stage: 'new',
  percent: 24,
  raisedUsd: 16560,
  remainingUsd: 52440,
};

describe('GraduationProgress', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('pins a 3 dp progressbar to the header bottom edge', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const bar = getByTestId(GraduationProgressSelectors.BAR);

    expect(bar.props.accessibilityRole).toStrictEqual('progressbar');
    expect(bar.props.accessibilityValue).toStrictEqual({
      min: 0,
      max: 100,
      now: 94,
    });
    expect(bar.props.accessibilityLabel).toStrictEqual(
      '94% bonded, $65.0K raised, $4.0K to graduation',
    );
    expect(bar.props.pointerEvents).toStrictEqual('none');
    const barStyle = mergedStyle(bar.props.style);
    expect(barStyle.position).toStrictEqual('absolute');
    expect(barStyle.bottom).toStrictEqual(0);
    expect(barStyle.left).toStrictEqual(0);
    expect(barStyle.right).toStrictEqual(0);
    expect(barStyle.height).toStrictEqual(3);
  });

  it('renders the unlit fuse track from the border token', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const trackStyle = mergedStyle(
      getByTestId(GraduationProgressSelectors.TRACK).props.style,
    );
    expect(trackStyle.backgroundColor).toStrictEqual(
      mockTheme.colors.border.muted,
    );
  });

  it('caps the fill with a 1.5 dp rounded right edge and clips its content', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const fillStyle = mergedStyle(
      getByTestId(GraduationProgressSelectors.FILL).props.style,
    );
    expect(fillStyle.borderTopRightRadius).toStrictEqual(1.5);
    expect(fillStyle.borderBottomRightRadius).toStrictEqual(1.5);
    expect(fillStyle.overflow).toStrictEqual('hidden');
  });

  it('fills with primary to success below the high-heat threshold', () => {
    const { getByTestId } = render(
      <GraduationProgress
        viewModel={{ ...BONDING, percent: 50, remainingUsd: 34500 }}
      />,
    );

    expect(
      getByTestId(GraduationProgressSelectors.FILL_GRADIENT).props.colors,
    ).toStrictEqual([
      mockTheme.colors.primary.default,
      mockTheme.colors.success.default,
    ]);
  });

  it('heats the fill to warning to success at ninety percent and up', () => {
    const { getByTestId } = render(
      <GraduationProgress
        viewModel={{ ...BONDING, percent: 92, remainingUsd: 5520 }}
      />,
    );

    expect(
      getByTestId(GraduationProgressSelectors.FILL_GRADIENT).props.colors,
    ).toStrictEqual([
      mockTheme.colors.warning.default,
      mockTheme.colors.success.default,
    ]);
  });

  it('rides a two-layer 12 dp comet glow on the fuse head', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const comet = getByTestId(GraduationProgressSelectors.COMET);

    const cometStyle = mergedStyle(comet.props.style);
    expect(cometStyle.width).toStrictEqual(12);
    expect(cometStyle.height).toStrictEqual(12);
    expect(cometStyle.marginLeft).toStrictEqual(-6);
    expect(cometStyle.marginTop).toStrictEqual(-4.5);

    const glowLayers = comet.props.children as {
      props: {
        style: { backgroundColor?: string }[] | { backgroundColor?: string };
      };
    }[];
    const backgrounds = glowLayers
      .flatMap((layer) =>
        Array.isArray(layer.props.style)
          ? layer.props.style
          : [layer.props.style],
      )
      .map((s) => s.backgroundColor)
      .filter((backgroundColor) => backgroundColor != null);

    expect(backgrounds).toStrictEqual([
      mockTheme.colors.success.muted,
      mockTheme.colors.success.muted,
    ]);
  });
});

describe('GraduationProgressDetail', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders the bonding microcopy with the distance to graduation', () => {
    const { getByTestId } = render(
      <GraduationProgressDetail viewModel={BONDING} />,
    );

    expect(getByTestId(GraduationProgressSelectors.DETAIL)).toHaveTextContent(
      /^\d+% bonded · \$4\.0K to graduation$/,
    );
    expect(getByTestId(GraduationProgressSelectors.COUNT_UP)).toBeDefined();
  });

  it('renders the new-token microcopy', () => {
    const { getByTestId } = render(
      <GraduationProgressDetail viewModel={NEW} />,
    );

    expect(getByTestId(GraduationProgressSelectors.DETAIL)).toHaveTextContent(
      /^\d+% to graduation$/,
    );
    expect(getByTestId(GraduationProgressSelectors.COUNT_UP)).toBeDefined();
  });

  it('shows the settled percent immediately under reduced motion', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <GraduationProgressDetail viewModel={BONDING} />,
    );

    expect(getByTestId(GraduationProgressSelectors.DETAIL)).toHaveTextContent(
      '94% bonded · $4.0K to graduation',
    );
    expect(queryByTestId(GraduationProgressSelectors.COUNT_UP)).toBeNull();
  });
});

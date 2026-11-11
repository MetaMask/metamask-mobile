import React from 'react';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { mockTheme } from '../../../../../util/theme';
import { colorWithOpacity } from '../../../../../util/colors';
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

  it('renders the unlit fuse track as a primary tint that reads on glass', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const trackStyle = mergedStyle(
      getByTestId(GraduationProgressSelectors.TRACK).props.style,
    );
    expect(trackStyle.backgroundColor).toStrictEqual(
      colorWithOpacity(mockTheme.colors.primary.default, 0.3),
    );
  });

  it('reveals the fill with a static-layout scaleX so the gradient paints on mount', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const fillStyle = mergedStyle(
      getByTestId(GraduationProgressSelectors.FILL).props.style,
    );
    expect(fillStyle.borderTopRightRadius).toStrictEqual(1.5);
    expect(fillStyle.borderBottomRightRadius).toStrictEqual(1.5);
    expect(fillStyle.overflow).toStrictEqual('hidden');
    expect(fillStyle.transformOrigin).toStrictEqual('left center');
    expect(fillStyle.left).toStrictEqual(0);
    expect(fillStyle.right).toStrictEqual(0);
    expect(fillStyle.width).toBeUndefined();
    // Mount starts fully collapsed and slid back; the worklets settle from
    // here under the animation clock.
    expect(fillStyle.transform).toStrictEqual([
      { scaleX: 0 },
      { translateX: -12 },
    ]);
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

  it('flows the sheen inside a clip that only spans the lit portion', () => {
    const { getByTestId } = render(<GraduationProgress viewModel={BONDING} />);

    const sheenStyle = mergedStyle(
      getByTestId(GraduationProgressSelectors.SHEEN).props.style,
    );
    expect(sheenStyle.width).toStrictEqual(40);

    const clipStyle = mergedStyle(
      getByTestId(GraduationProgressSelectors.SHEEN_CLIP).props.style,
    );
    // The clip tracks the fill's animated percent, so the exact width depends
    // on the animation frame; only its shape is stable.
    expect(String(clipStyle.width)).toMatch(/^\d+%$/);
    expect(clipStyle.overflow).toStrictEqual('hidden');
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

  it('renders the bonding microcopy compactly with just the percent', () => {
    const { getByTestId } = render(
      <GraduationProgressDetail viewModel={BONDING} />,
    );

    const detail = getByTestId(GraduationProgressSelectors.DETAIL, {
      includeHiddenElements: true,
    });
    // The count-up node is hidden from accessibility queries on purpose (the
    // progressbar already announces this copy), so walk the tree structurally.
    const countUp = detail.findByProps({
      testID: GraduationProgressSelectors.COUNT_UP,
    });
    expect(String(countUp.props.children)).toMatch(/^\d+% bonded$/);
    expect(detail.props.accessibilityElementsHidden).toBe(true);
    expect(detail.props.importantForAccessibility).toStrictEqual(
      'no-hide-descendants',
    );
  });

  it('renders the new-token microcopy', () => {
    const { getByTestId } = render(
      <GraduationProgressDetail viewModel={NEW} />,
    );

    const detail = getByTestId(GraduationProgressSelectors.DETAIL, {
      includeHiddenElements: true,
    });
    expect(
      String(
        detail.findByProps({ testID: GraduationProgressSelectors.COUNT_UP })
          .props.children,
      ),
    ).toMatch(/^\d+% to grad\.$/);
  });

  it('collapses to the bare percent beside the live price', () => {
    const { getByTestId } = render(
      <GraduationProgressDetail compact viewModel={BONDING} />,
    );

    const detail = getByTestId(GraduationProgressSelectors.DETAIL, {
      includeHiddenElements: true,
    });
    expect(
      String(
        detail.findByProps({ testID: GraduationProgressSelectors.COUNT_UP })
          .props.children,
      ),
    ).toMatch(/^\d+%$/);
  });

  it('shows the settled percent immediately under reduced motion', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByTestId } = render(
      <GraduationProgressDetail viewModel={BONDING} />,
    );

    const detail = getByTestId(GraduationProgressSelectors.DETAIL, {
      includeHiddenElements: true,
    });
    expect(detail.props.children).toStrictEqual('94% bonded');
    expect(() =>
      detail.findByProps({ testID: GraduationProgressSelectors.COUNT_UP }),
    ).toThrow();
  });

  it('shows the settled bare percent under reduced motion', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByTestId } = render(
      <GraduationProgressDetail compact viewModel={BONDING} />,
    );

    const detail = getByTestId(GraduationProgressSelectors.DETAIL, {
      includeHiddenElements: true,
    });
    expect(detail.props.children).toStrictEqual('94%');
  });
});

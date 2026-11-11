/**
 * Unit, not component-view: placeholder graphic. No Redux, route, or controller.
 */
import React from 'react';
import { Dimensions } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { getHardwareTier } from '../../../../util/deviceCapability';
import ChartLineSkeleton from './ChartLineSkeleton';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseReducedMotion = jest.mocked(useReducedMotion);

const ID = 'chart-line-skeleton';
const HEIGHT = 180;
const END_DOT_INSET = 16;

const flatStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, item) => ({ ...merged, ...flatStyle(item) }),
      {},
    );
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
};

describe('ChartLineSkeleton', () => {
  beforeEach(() => {
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('adds no progressbar role or accessibility label', () => {
    const { getByTestId, queryByRole } = render(
      <ChartLineSkeleton height={HEIGHT} />,
    );

    expect(queryByRole('progressbar')).toBeNull();
    expect(getByTestId(ID).props.accessibilityLabel).toBeUndefined();
  });

  it('fills the chart height', () => {
    const { getByTestId } = render(<ChartLineSkeleton height={HEIGHT} />);

    expect(flatStyle(getByTestId(ID).props.style).height).toBe(HEIGHT);
  });

  it('draws the line inside the 16px side gutters with an inset end dot', () => {
    const width = Dimensions.get('window').width;
    const { getByTestId } = render(<ChartLineSkeleton height={HEIGHT} />);
    const line = getByTestId(`${ID}-line`);
    const end = getByTestId(`${ID}-end`);

    expect(line.props.d.startsWith('M16 ')).toBe(true);
    expect(line.props.strokeWidth).toBe(2);
    expect(end.props.cx).toBe(width - END_DOT_INSET);
    expect(end.props.cy).toBe(54);
    expect(end.props.r).toBe(8);
  });

  it('refits the end dot when the chart row lays out', () => {
    const { getByTestId } = render(<ChartLineSkeleton height={HEIGHT} />);

    fireEvent(getByTestId(ID), 'layout', {
      nativeEvent: { layout: { width: 320, height: HEIGHT } },
    });

    expect(getByTestId(`${ID}-end`).props.cx).toBe(320 - END_DOT_INSET);
  });

  it.each([
    ['LOW', 'static', 'pulse'],
    ['MID', 'pulse', 'static'],
    ['HIGH', 'pulse', 'static'],
    [null, 'pulse', 'static'],
  ] as const)(
    'renders the %s hardware tier line as %s',
    (tier, shown, hidden) => {
      mockGetHardwareTier.mockReturnValueOnce(tier);

      const { getByTestId, queryByTestId } = render(
        <ChartLineSkeleton height={HEIGHT} />,
      );

      expect(queryByTestId(`${ID}-${hidden}`)).toBeNull();
      expect(flatStyle(getByTestId(`${ID}-${shown}`).props.style).opacity).toBe(
        0.2,
      );
      expect(getByTestId(`${ID}-line`)).toBeOnTheScreen();
    },
  );

  it('renders the line static when Reduce Motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <ChartLineSkeleton height={HEIGHT} />,
    );

    expect(queryByTestId(`${ID}-pulse`)).toBeNull();
    expect(getByTestId(`${ID}-static`)).toBeOnTheScreen();
    expect(getByTestId(`${ID}-line`)).toBeOnTheScreen();
  });
});

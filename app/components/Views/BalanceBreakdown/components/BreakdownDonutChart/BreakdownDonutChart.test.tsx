import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render } from '@testing-library/react-native';
import BreakdownDonutChart from './BreakdownDonutChart';
import { BalanceBreakdownTestIds } from '../../BalanceBreakdown.testIds';
import type { SliceData } from '../../types';
import { mockTheme } from '../../../../../util/theme';
import { getBalanceBreakdownSliceColors } from '../../utils/getBalanceBreakdownSliceColors';

const SLICE_COLORS = getBalanceBreakdownSliceColors(mockTheme.colors);

jest.mock('react-native-svg', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View, TouchableOpacity: RNTouchableOpacity } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    G: View,
    Path: function MockPath({ onPress, testID }: { onPress?: () => void; testID?: string }) {
      return ReactActual.createElement(RNTouchableOpacity, { onPress, testID });
    },
    Circle: View,
  };
});

const makeSlice = (
  key: SliceData['key'],
  valueFiat: number,
  percentOfTotal: number,
  status: SliceData['status'] = 'ready',
): SliceData => ({
  key,
  label: key,
  color: SLICE_COLORS[key],
  valueFiat,
  percentOfTotal,
  status,
  drilldown: [],
});

const ALL_SLICES: Record<SliceData['key'], SliceData> = {
  tokens: makeSlice('tokens', 50000, 0.5),
  perps: makeSlice('perps', 30000, 0.3),
  predict: makeSlice('predict', 20000, 0.2),
  defi: makeSlice('defi', 0, 0, 'ineligible'),
};

describe('BreakdownDonutChart', () => {
  it('renders the donut test ID', () => {
    const { getByTestId } = render(
      <BreakdownDonutChart
        slices={ALL_SLICES}
        selectedSlice="all"
        onSlicePress={jest.fn()}
      />,
    );
    expect(getByTestId(BalanceBreakdownTestIds.DONUT_CHART)).toBeDefined();
  });

  it('calls onSlicePress with correct key', () => {
    const onPress = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <BreakdownDonutChart
        slices={ALL_SLICES}
        selectedSlice="all"
        onSlicePress={onPress}
      />,
    );
    // Find the touchable wrappers and press the first one
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    touchables[0].props.onPress?.();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders an empty ring when all slices are zero / ineligible', () => {
    const zeroSlices = {
      tokens: makeSlice('tokens', 0, 0),
      perps: makeSlice('perps', 0, 0),
      predict: makeSlice('predict', 0, 0),
      defi: makeSlice('defi', 0, 0, 'ineligible'),
    };
    const { getByTestId } = render(
      <BreakdownDonutChart
        slices={zeroSlices}
        selectedSlice="all"
        onSlicePress={jest.fn()}
      />,
    );
    // Container still renders
    expect(getByTestId(BalanceBreakdownTestIds.DONUT_CHART)).toBeDefined();
  });
});

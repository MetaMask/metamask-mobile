import React, { useMemo } from 'react';
import { G, Path, Svg } from 'react-native-svg';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../../util/theme';
import {
  buildVaultCompositionChartModel,
  CHART_VIEWBOX_SIZE,
  formatAllocationPercentage,
} from './MoneyVaultCompositionChart.utils';
import type { MoneyVaultCompositionChartProps } from './MoneyVaultCompositionChart.types';
import { MoneyVaultCompositionChartTestIds } from './MoneyVaultCompositionChart.testIds';

const getWedgeColor = (
  componentKey: string,
  colors: ReturnType<typeof useTheme>['colors'],
): string => {
  switch (componentKey) {
    case 'direct_idle_musd':
      return colors.primary.default;
    case 'direct_idle_usdc':
      return colors.success.default;
    case 'aave_v3_musd':
      return colors.info.default;
    case 'morpho_v2_musd':
      return colors.warning.default;
    case 'morpho_v2_usdc':
      return colors.error.default;
  }

  // In case component key isn't part of known keys above. We still want to return a different color.
  const fallbackColors = [
    colors.primary.alternative,
    colors.error.alternative,
    colors.warning.defaultHover,
    colors.success.defaultHover,
    colors.icon.alternative,
  ];
  const hash = componentKey
    .split('')
    .reduce(
      (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
      0,
    );

  return fallbackColors[hash % fallbackColors.length];
};

const MoneyVaultCompositionChart = ({
  components,
}: MoneyVaultCompositionChartProps): React.ReactElement => {
  const { colors } = useTheme();
  const model = useMemo(
    () => buildVaultCompositionChartModel(components),
    [components],
  );

  if (model.status === 'empty') {
    return (
      <Box
        testID={MoneyVaultCompositionChartTestIds.EMPTY}
        twClassName="items-center justify-center px-4 py-8"
      >
        <Text variant={TextVariant.BodyMd}>
          {strings('money.earnings.chart_empty')}
        </Text>
      </Box>
    );
  }

  if (model.status === 'invalid') {
    return (
      <Box
        testID={MoneyVaultCompositionChartTestIds.INVALID}
        accessibilityRole="alert"
        twClassName="items-center justify-center px-4 py-8"
      >
        <Text variant={TextVariant.BodyMd}>
          {strings('money.earnings.chart_invalid')}
        </Text>
      </Box>
    );
  }

  const activeWedge =
    model.wedges.find(
      ({ componentKey }) => componentKey === model.defaultActiveKey,
    ) ?? model.wedges[0];
  const centerPercentage = formatAllocationPercentage(
    activeWedge.allocationFraction,
    I18n.locale,
  );

  return (
    <Box
      testID={MoneyVaultCompositionChartTestIds.CHART}
      twClassName="items-center justify-center"
      style={{
        width: CHART_VIEWBOX_SIZE,
        height: CHART_VIEWBOX_SIZE,
      }}
    >
      <Svg
        width={CHART_VIEWBOX_SIZE}
        height={CHART_VIEWBOX_SIZE}
        viewBox={`0 0 ${CHART_VIEWBOX_SIZE} ${CHART_VIEWBOX_SIZE}`}
        accessible={false}
      >
        <G
          testID={MoneyVaultCompositionChartTestIds.RING}
          transform={`translate(${CHART_VIEWBOX_SIZE / 2}, ${
            CHART_VIEWBOX_SIZE / 2
          })`}
          accessible={false}
        >
          {model.wedges.map((wedge) => (
            <Path
              key={wedge.componentKey}
              testID={MoneyVaultCompositionChartTestIds.WEDGE(
                wedge.componentKey,
              )}
              d={wedge.path}
              fill={getWedgeColor(wedge.componentKey, colors)}
              accessible={false}
            />
          ))}
        </G>
      </Svg>
      <Box
        pointerEvents="none"
        twClassName="absolute inset-0 items-center justify-center px-4"
      >
        <Text
          testID={MoneyVaultCompositionChartTestIds.CENTER_PERCENTAGE}
          variant={TextVariant.DisplayMd}
          numberOfLines={1}
        >
          {centerPercentage}
        </Text>
        <Text
          testID={MoneyVaultCompositionChartTestIds.CENTER_LABEL}
          variant={TextVariant.BodySm}
          numberOfLines={2}
          ellipsizeMode="tail"
          accessibilityLabel={activeWedge.component.label}
          twClassName="max-w-full text-center"
        >
          {activeWedge.component.label}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyVaultCompositionChart;

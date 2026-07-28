import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-svg-charts';

import { useTheme } from '../../../../../../../util/theme';
import {
  buildResearchChartSummary,
  formatResearchChartValue,
  getResearchChartDomain,
  getValidResearchChartPoints,
  ResearchChartPoint,
} from './ResearchChart.utils';

export const RESEARCH_CHART_TEST_IDS = {
  CHART: 'wallet-assistant-research-chart-visualization',
  CONTAINER: 'wallet-assistant-research-chart',
  SUMMARY: 'wallet-assistant-research-chart-summary',
} as const;

export interface ResearchChartProps {
  points: readonly ResearchChartPoint[];
  title: string;
  unit?: string;
  testID?: string;
}

/**
 * A compact categorical comparison for small, source-backed research series.
 * The exact values and an equivalent textual summary remain available without
 * relying on color or chart geometry.
 */
const ResearchChart = ({
  points,
  title,
  unit = '',
  testID = RESEARCH_CHART_TEST_IDS.CONTAINER,
}: ResearchChartProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const validPoints = useMemo(
    () => getValidResearchChartPoints(points),
    [points],
  );
  const summary = useMemo(
    () => buildResearchChartSummary(title.trim(), validPoints, unit),
    [title, unit, validPoints],
  );

  if (!title.trim() || validPoints.length === 0) {
    return null;
  }

  const domain = getResearchChartDomain(validPoints);
  const chartData = validPoints.map((point) => ({
    value: point.value,
    svg: {
      fill: point.value < 0 ? colors.error.default : colors.primary.default,
    },
  }));

  return (
    <Box
      accessible
      accessibilityLabel={summary}
      testID={testID}
      twClassName="w-full gap-3 border-t border-muted pt-5"
    >
      <Box twClassName="gap-0.5">
        <Text variant={TextVariant.HeadingSm}>{title.trim()}</Text>
        {unit.trim() ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {unit.trim()}
          </Text>
        ) : null}
      </Box>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={RESEARCH_CHART_TEST_IDS.CHART}
      >
        <BarChart
          style={tw`h-32`}
          data={chartData}
          yAccessor={({ item }) => item.value}
          gridMin={domain.minimum}
          gridMax={domain.maximum}
          spacingInner={0.3}
          spacingOuter={0.12}
          contentInset={{ top: 8, bottom: 8 }}
        />
      </View>

      <Box twClassName="flex-row">
        {validPoints.map((point, index) => (
          <Box
            key={`${point.label}-${index}`}
            twClassName="min-w-0 flex-1 items-center gap-0.5 px-0.5"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {point.label.trim()}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={
                point.value < 0 ? TextColor.ErrorDefault : TextColor.TextDefault
              }
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {formatResearchChartValue(point.value, unit)}
            </Text>
          </Box>
        ))}
      </Box>

      <Text
        testID={RESEARCH_CHART_TEST_IDS.SUMMARY}
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
      >
        {summary}
      </Text>
    </Box>
  );
};

export default ResearchChart;

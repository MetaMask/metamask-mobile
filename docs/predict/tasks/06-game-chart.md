# Task 06: PredictGameChart Component

## Description

Create a new chart component specifically for NFL game markets. This chart displays dual lines representing each team's win probability over time, with interactive scrubbing and live data support.

## Requirements

- Dual-line chart showing both teams' probabilities
- Team-colored lines (away team color, home team color)
- Interactive touch scrubbing with tooltip
- Timeframe selector (Live, 6H, 1D, Max)
- Endpoint dots showing current values
- Support for live price updates
- Dark/light mode support
- Unit tests

## Dependencies

- Task 00: Feature Flag and Data Types
- Task 03: UI Primitives

## Designs

- @nfl-details-chart.png - Chart specifications
- @nfl-details-dark-light.png - Theme variations

### Design Specifications

**Chart Elements:**

- Two inverse lines (team A probability + team B probability = 100%)
- Team A (away): Blue/team color line
- Team B (home): Orange/team color line
- Y-axis: 0-100% (percentage)
- X-axis: Time based on selected range
- Endpoint dots at current values
- Interactive crosshair on touch

**Timeframe Options:**

- Live: Real-time updates (last hour)
- 6H: Last 6 hours
- 1D: Last 24 hours
- Max: All time since market creation

**Interaction:**

- Touch and drag to scrub through history
- Tooltip shows timestamp and both team percentages
- Release returns to current values

## Implementation

### 1. Component Structure

Create `app/components/UI/Predict/components/PredictGameChart/`:

**PredictGameChart.types.ts:**

```typescript
export interface GameChartDataPoint {
  timestamp: number;
  value: number;
}

export interface GameChartSeries {
  label: string;
  color: string;
  data: GameChartDataPoint[];
}

export type ChartTimeframe = 'live' | '6h' | '1d' | 'max';

export interface PredictGameChartProps {
  data: GameChartSeries[];
  isLoading?: boolean;
  timeframe?: ChartTimeframe;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  testID?: string;
}
```

**PredictGameChart.tsx:**

```typescript
import React, { useMemo, useRef, useCallback, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant, TextColor } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import * as shape from 'd3-shape';
import { PredictGameChartProps, ChartTimeframe, GameChartSeries } from './PredictGameChart.types';
import TimeframeSelector from './TimeframeSelector';
import ChartTooltip from './ChartTooltip';
import EndpointDots from './EndpointDots';

const CHART_HEIGHT = 160;
const CHART_CONTENT_INSET = { top: 20, bottom: 20, left: 0, right: 20 };
const LINE_CURVE = shape.curveMonotoneX;

const PredictGameChart: React.FC<PredictGameChartProps> = ({
  data,
  isLoading = false,
  timeframe = 'live',
  onTimeframeChange,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const chartWidthRef = useRef<number>(0);

  // Limit to 2 series (away and home team)
  const seriesToRender = useMemo(() => data.slice(0, 2), [data]);
  const nonEmptySeries = useMemo(
    () => seriesToRender.filter((series) => series.data.length > 0),
    [seriesToRender],
  );
  const hasData = nonEmptySeries.length > 0;

  // Calculate chart bounds
  const { chartMin, chartMax } = useMemo(() => {
    if (!hasData) {
      return { chartMin: 0, chartMax: 100 };
    }

    const chartValues = nonEmptySeries.flatMap((series) =>
      series.data.map((point) => point.value),
    );
    const minValue = Math.min(...chartValues);
    const maxValue = Math.max(...chartValues);
    const range = maxValue - minValue;
    const padding = range === 0 ? Math.max(maxValue * 0.1, 1) : range * 0.1;

    return {
      chartMin: Math.max(0, minValue - padding),
      chartMax: Math.min(100, maxValue + padding),
    };
  }, [hasData, nonEmptySeries]);

  const primarySeries = nonEmptySeries[0] ?? seriesToRender[0];
  const primaryData = primarySeries?.data ?? [];
  const primaryChartData = primaryData.length
    ? primaryData.map((point) => point.value)
    : [50, 50]; // Default to 50% if no data

  // Handle chart layout
  const handleChartLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      chartWidthRef.current = event.nativeEvent.layout.width;
    },
    [],
  );

  // Update position from touch
  const updatePosition = useCallback(
    (xCoord: number) => {
      if (primaryData.length === 0) return;

      const adjustedX = xCoord - CHART_CONTENT_INSET.left;
      const chartDataWidth =
        chartWidthRef.current -
        CHART_CONTENT_INSET.left -
        CHART_CONTENT_INSET.right;

      if (chartDataWidth <= 0) return;

      const index = Math.round(
        (adjustedX / chartDataWidth) * (primaryData.length - 1),
      );

      const clampedIndex = Math.max(0, Math.min(primaryData.length - 1, index));
      setActiveIndex(clampedIndex);
    },
    [primaryData.length],
  );

  // Pan responder for touch interaction
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
        },
        onPanResponderTerminationRequest: (_event, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dy) > Math.abs(dx);
        },
        onPanResponderGrant: (event) => {
          updatePosition(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event, gestureState) => {
          const { dx, dy } = gestureState;
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
            setActiveIndex(-1);
          } else {
            updatePosition(event.nativeEvent.locationX);
          }
        },
        onPanResponderRelease: () => {
          setActiveIndex(-1);
        },
        onPanResponderTerminate: () => {
          setActiveIndex(-1);
        },
      }),
    [updatePosition],
  );

  // Loading state
  if (isLoading) {
    return (
      <Box twClassName="flex-1" testID={testID}>
        <View style={tw.style(`h-[${CHART_HEIGHT}px] bg-background-alternative rounded-lg`)} />
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
            disabled
          />
        )}
      </Box>
    );
  }

  // No data state
  if (!hasData) {
    return (
      <Box twClassName="flex-1 justify-center items-center" testID={testID}>
        <View style={tw.style(`h-[${CHART_HEIGHT}px] justify-center items-center`)}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            No price history available
          </Text>
        </View>
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
          />
        )}
      </Box>
    );
  }

  const overlaySeries = nonEmptySeries.slice(1);

  return (
    <Box twClassName="flex-1" testID={testID}>
      <View
        style={tw.style(`h-[${CHART_HEIGHT}px]`)}
        {...panResponder.panHandlers}
        onLayout={handleChartLayout}
      >
        {/* Primary line chart */}
        <LineChart
          style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
          data={primaryChartData}
          svg={{
            stroke: primarySeries?.color || colors.primary.default,
            strokeWidth: 2,
          }}
          contentInset={CHART_CONTENT_INSET}
          yMin={chartMin}
          yMax={chartMax}
          curve={LINE_CURVE}
        >
          {activeIndex < 0 && (
            <EndpointDots nonEmptySeries={nonEmptySeries} />
          )}
        </LineChart>

        {/* Overlay series (second team) */}
        {overlaySeries.map((series, index) => (
          <LineChart
            key={`overlay-${index}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            data={series.data.map((point) => point.value)}
            svg={{ stroke: series.color, strokeWidth: 2 }}
            contentInset={CHART_CONTENT_INSET}
            yMin={chartMin}
            yMax={chartMax}
            curve={LINE_CURVE}
          />
        ))}

        {/* Tooltip layer */}
        {activeIndex >= 0 && (
          <LineChart
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            data={primaryChartData}
            svg={{ stroke: 'transparent', strokeWidth: 0 }}
            contentInset={CHART_CONTENT_INSET}
            yMin={chartMin}
            yMax={chartMax}
            curve={LINE_CURVE}
          >
            <ChartTooltip
              activeIndex={activeIndex}
              primaryData={primaryData}
              nonEmptySeries={nonEmptySeries}
              colors={colors}
            />
          </LineChart>
        )}
      </View>

      {/* Timeframe selector */}
      {onTimeframeChange && (
        <TimeframeSelector
          selected={timeframe}
          onSelect={onTimeframeChange}
        />
      )}
    </Box>
  );
};

export default PredictGameChart;
```

### 2. Sub-components

**TimeframeSelector.tsx:**

```typescript
import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ChartTimeframe } from './PredictGameChart.types';

interface TimeframeSelectorProps {
  selected: ChartTimeframe;
  onSelect: (timeframe: ChartTimeframe) => void;
  disabled?: boolean;
}

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: '6h', label: '6H' },
  { value: '1d', label: '1D' },
  { value: 'max', label: 'Max' },
];

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selected,
  onSelect,
  disabled = false,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="justify-center gap-2 mt-3"
    >
      {TIMEFRAMES.map(({ value, label }) => {
        const isSelected = selected === value;

        return (
          <Pressable
            key={value}
            onPress={() => !disabled && onSelect(value)}
            disabled={disabled}
            style={tw.style(
              'px-4 py-2 rounded-full',
              isSelected
                ? 'bg-background-pressed'
                : 'bg-transparent',
              disabled && 'opacity-50',
            )}
          >
            <Text
              variant={TextVariant.BodySm}
              color={
                isSelected
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
};

export default TimeframeSelector;
```

**ChartTooltip.tsx:**

```typescript
import React from 'react';
import { Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';
import { GameChartSeries, GameChartDataPoint } from './PredictGameChart.types';
import type { Colors } from '../../../../../util/theme/models';

const CHART_HEIGHT = 160;

interface ChartTooltipProps {
  x?: (index: number) => number;
  y?: (value: number) => number;
  activeIndex: number;
  primaryData: GameChartDataPoint[];
  nonEmptySeries: GameChartSeries[];
  colors: Colors;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  x,
  y,
  activeIndex,
  primaryData,
  nonEmptySeries,
  colors,
}) => {
  if (!x || !y) return null;
  if (activeIndex < 0 || !primaryData[activeIndex]) return null;

  const xPos = x(activeIndex);
  const labelPadding = 6;
  const fontSize = 12;
  const labelHeight = fontSize + labelPadding * 2;
  const labelOffset = 10;

  const maxDataIndex = primaryData.length - 1;
  const isRightSide = activeIndex > maxDataIndex / 2;

  return (
    <G>
      {/* Vertical line */}
      <Line
        x1={xPos}
        x2={xPos}
        y1={0}
        y2={CHART_HEIGHT}
        stroke={colors.border.muted}
        strokeWidth={2}
      />

      {/* Data points and labels */}
      {nonEmptySeries.map((series, seriesIndex) => {
        const seriesData = series.data[activeIndex];
        if (!seriesData) return null;

        const lineYPos = y(seriesData.value);
        const labelText = `${series.label}: ${seriesData.value.toFixed(0)}%`;
        const textWidth = labelText.length * (fontSize * 0.55);
        const labelWidth = textWidth + labelPadding * 2;

        const labelX = isRightSide
          ? xPos - labelWidth - labelOffset
          : xPos + labelOffset;

        // Adjust Y to avoid overlap
        let adjustedY = lineYPos - labelHeight / 2;
        if (seriesIndex > 0) {
          adjustedY = Math.max(adjustedY, lineYPos + 20);
        }

        return (
          <G key={`series-${seriesIndex}`}>
            <Circle
              cx={xPos}
              cy={lineYPos}
              r={6}
              stroke={colors.background.default}
              strokeWidth={2}
              fill={series.color}
            />
            <Rect
              x={labelX}
              y={adjustedY}
              width={labelWidth}
              height={labelHeight}
              fill={series.color}
              rx={4}
              ry={4}
            />
            <SvgText
              x={labelX + labelPadding}
              y={adjustedY + labelHeight / 2 + fontSize / 3}
              fill={colors.background.default}
              fontSize={fontSize}
              fontWeight="600"
            >
              {labelText}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
};

export default ChartTooltip;
```

**EndpointDots.tsx:**

```typescript
import React from 'react';
import { Circle, G } from 'react-native-svg';
import { GameChartSeries } from './PredictGameChart.types';

interface EndpointDotsProps {
  x?: (index: number) => number;
  y?: (value: number) => number;
  nonEmptySeries: GameChartSeries[];
}

const EndpointDots: React.FC<EndpointDotsProps> = ({
  x,
  y,
  nonEmptySeries,
}) => {
  if (!x || !y) return null;

  return (
    <G>
      {nonEmptySeries.map((series, seriesIndex) => {
        const lastIndex = series.data.length - 1;
        const lastPoint = series.data[lastIndex];
        if (!lastPoint) return null;

        return (
          <Circle
            key={`endpoint-${seriesIndex}`}
            cx={x(lastIndex)}
            cy={y(lastPoint.value)}
            r={6}
            fill={series.color}
          />
        );
      })}
    </G>
  );
};

export default EndpointDots;
```

### 3. Unit Tests

**PredictGameChart.test.tsx:**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGameChart from './PredictGameChart';
import { GameChartSeries } from './PredictGameChart.types';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      background: { default: '#FFFFFF' },
      border: { muted: '#E0E0E0' },
    },
  }),
}));

const mockData: GameChartSeries[] = [
  {
    label: 'SEA',
    color: '#002244',
    data: [
      { timestamp: 1000, value: 50 },
      { timestamp: 2000, value: 55 },
      { timestamp: 3000, value: 60 },
      { timestamp: 4000, value: 70 },
    ],
  },
  {
    label: 'DEN',
    color: '#FB4F14',
    data: [
      { timestamp: 1000, value: 50 },
      { timestamp: 2000, value: 45 },
      { timestamp: 3000, value: 40 },
      { timestamp: 4000, value: 30 },
    ],
  },
];

describe('PredictGameChart', () => {
  it('renders chart with data', () => {
    const { getByTestId } = render(
      <PredictGameChart data={mockData} testID="chart" />
    );

    expect(getByTestId('chart')).toBeTruthy();
  });

  it('renders loading state', () => {
    const { getByTestId } = render(
      <PredictGameChart data={[]} isLoading testID="chart" />
    );

    expect(getByTestId('chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    const { getByText } = render(
      <PredictGameChart data={[]} testID="chart" />
    );

    expect(getByText('No price history available')).toBeTruthy();
  });

  it('calls onTimeframeChange when timeframe is selected', () => {
    const onTimeframeChange = jest.fn();

    const { getByText } = render(
      <PredictGameChart
        data={mockData}
        onTimeframeChange={onTimeframeChange}
      />
    );

    fireEvent.press(getByText('6H'));

    expect(onTimeframeChange).toHaveBeenCalledWith('6h');
  });
});
```

## Files to Create

| Action | File                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| Create | `app/components/UI/Predict/components/PredictGameChart/PredictGameChart.tsx`      |
| Create | `app/components/UI/Predict/components/PredictGameChart/PredictGameChart.types.ts` |
| Create | `app/components/UI/Predict/components/PredictGameChart/PredictGameChart.test.tsx` |
| Create | `app/components/UI/Predict/components/PredictGameChart/TimeframeSelector.tsx`     |
| Create | `app/components/UI/Predict/components/PredictGameChart/ChartTooltip.tsx`          |
| Create | `app/components/UI/Predict/components/PredictGameChart/EndpointDots.tsx`          |
| Create | `app/components/UI/Predict/components/PredictGameChart/index.ts`                  |

## Acceptance Criteria

- [ ] Chart renders dual lines with team colors
- [ ] Endpoint dots show current values
- [ ] Touch scrubbing shows tooltip with both team values
- [ ] Timeframe selector changes data range
- [ ] Loading state displays correctly
- [ ] Empty state displays correctly
- [ ] Dark/light mode supported
- [ ] All unit tests pass

## Estimated Effort

8-10 hours

## Assignee

Developer C (UI - Details Screen Track)

import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { G, Path, Svg } from 'react-native-svg';
import {
  Box,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { formatVaultCompositionLabel } from '../../../../utils/moneyVaultComposition';
import { formatPercentage } from '../../../../utils/formatPercentage';
import { useTheme } from '../../../../../../../util/theme';
import {
  buildVaultCompositionChartModel,
  CHART_VIEWBOX_SIZE,
  getVaultCompositionComponentColor,
} from './MoneyVaultCompositionChart.utils';
import type {
  ComponentKey,
  MoneyVaultCompositionChartProps,
} from './MoneyVaultCompositionChart.types';
import { MoneyVaultCompositionChartTestIds } from './MoneyVaultCompositionChart.testIds';
import useMoneyVaultCompositionChartInteraction from './useMoneyVaultCompositionChartInteraction';

const MoneyVaultCompositionChart = ({
  components,
  isLoading = false,
  setScrollEnabled,
}: MoneyVaultCompositionChartProps): React.ReactElement => {
  const { colors } = useTheme();
  const model = useMemo(
    () => buildVaultCompositionChartModel(components),
    [components],
  );
  const readyWedges = model.status === 'ready' ? model.wedges : [];
  const defaultActiveKey: ComponentKey | null =
    model.status === 'ready' ? model.defaultActiveKey : null;
  const { activeKey, isInteracting, panHandlers, selectNext, selectPrevious } =
    useMoneyVaultCompositionChartInteraction({
      wedges: readyWedges,
      defaultActiveKey,
      setScrollEnabled,
    });
  const activeWedge =
    model.status === 'ready'
      ? (model.wedges.find(({ componentKey }) => componentKey === activeKey) ??
        model.wedges[0])
      : undefined;
  const previousActiveKey = useRef<ComponentKey | null>(null);

  const centerPercentage = activeWedge
    ? formatPercentage(activeWedge.allocationFraction)
    : null;
  const accessibilityText = activeWedge
    ? strings('money.earnings.chart_allocation_accessibility_label', {
        label: activeWedge.component.label,
        percentage: centerPercentage,
      })
    : null;

  useEffect(() => {
    if (!activeWedge || !accessibilityText) {
      previousActiveKey.current = null;
      return;
    }

    if (
      previousActiveKey.current !== null &&
      previousActiveKey.current !== activeWedge.componentKey
    ) {
      AccessibilityInfo.announceForAccessibility(accessibilityText);
    }

    previousActiveKey.current = activeWedge.componentKey;
  }, [accessibilityText, activeWedge]);

  if (isLoading) {
    return (
      <Skeleton
        testID={MoneyVaultCompositionChartTestIds.LOADING}
        height={CHART_VIEWBOX_SIZE}
        width={CHART_VIEWBOX_SIZE}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={strings('money.earnings.allocation_loading')}
        twClassName="rounded-full"
      />
    );
  }

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

  if (!activeWedge) {
    throw new Error('Ready vault composition chart has no active wedge');
  }

  const activeWedgeIndex = model.wedges.findIndex(
    ({ componentKey }) => componentKey === activeWedge.componentKey,
  );

  return (
    <Box
      {...panHandlers}
      testID={MoneyVaultCompositionChartTestIds.CHART}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityText ?? undefined}
      accessibilityValue={{
        min: 0,
        max: model.wedges.length - 1,
        now: activeWedgeIndex,
        text: accessibilityText ?? undefined,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') {
          selectNext();
        } else if (event.nativeEvent.actionName === 'decrement') {
          selectPrevious();
        }
      }}
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
              d={
                isInteracting && wedge.componentKey === activeWedge.componentKey
                  ? wedge.pressedPath
                  : wedge.path
              }
              fill={getVaultCompositionComponentColor(
                wedge.componentKey,
                colors,
              )}
              opacity={
                isInteracting && wedge.componentKey !== activeWedge.componentKey
                  ? 0.35
                  : undefined
              }
              accessible={false}
            />
          ))}
        </G>
      </Svg>
      <Box
        pointerEvents="none"
        accessible={false}
        twClassName="absolute inset-0 items-center justify-center px-8"
      >
        <Text
          testID={MoneyVaultCompositionChartTestIds.CENTER_PERCENTAGE}
          variant={TextVariant.DisplayMd}
          numberOfLines={1}
          accessible={false}
        >
          {centerPercentage}
        </Text>
        <Text
          testID={MoneyVaultCompositionChartTestIds.CENTER_LABEL}
          variant={TextVariant.BodySm}
          numberOfLines={2}
          ellipsizeMode="tail"
          accessibilityLabel={activeWedge.component.label}
          accessible={false}
          twClassName="max-w-full text-center"
        >
          {formatVaultCompositionLabel(activeWedge.component)}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyVaultCompositionChart;

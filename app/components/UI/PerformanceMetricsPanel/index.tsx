import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  ButtonBase,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import {
  selectPerformanceMetrics,
  selectPerformanceSession,
} from '../../../core/redux/slices/performance';

const formatDuration = (ms?: number) =>
  typeof ms === 'number' ? `${ms.toFixed(0)} ms` : '—';

const formatTime = (ts?: number) =>
  ts ? new Date(ts).toLocaleTimeString() : '';

const PerformanceMetricsPanel: React.FC = () => {
  const tw = useTailwind();
  const [open, setOpen] = useState(false);
  const metrics = useSelector(selectPerformanceMetrics);
  const session = useSelector(selectPerformanceSession);

  const metricsNormalized = useMemo(() => metrics ?? [], [metrics]);

  const rows = useMemo(
    () =>
      [...metricsNormalized].reverse().slice(0, 50).map((m, idx) => (
        <Box
          key={`${m.eventName}-${m.timestamp}-${idx}`}
          twClassName="flex-row items-center justify-between px-3 py-2 border-b border-muted"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.BodySm}>{formatTime(m.timestamp)}</Text>
          </Box>
          <Box twClassName="flex-1 px-3">
            <Text variant={TextVariant.BodySm}>{m.eventName}</Text>
          </Box>
          <Text variant={TextVariant.BodySm}>{formatDuration(m.duration)}</Text>
        </Box>
      )),
    [metricsNormalized],
  );

  return (
    <Box
      twClassName="absolute left-0 right-0 z-50"
      style={tw.style('bottom-0')}
      pointerEvents="box-none"
    >
      <Box twClassName="items-end px-3 pb-2" pointerEvents="box-none">
        <ButtonBase
          twClassName="rounded-md bg-muted px-3 py-2"
          style={({ pressed }) => tw.style(pressed && 'bg-pressed')}
          onPress={() => setOpen((v) => !v)}
        >
          <Text variant={TextVariant.BodySm}>
            {open ? 'Hide Perf' : 'Show Perf'}
          </Text>
        </ButtonBase>
      </Box>
      {open ? (
        <Box
          twClassName="mx-3 mb-3 rounded-lg bg-default/90"
          style={tw.style('max-h-80')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="px-3 py-2 border-b border-muted"
          >
            <Text variant={TextVariant.HeadingSm}>Performance Metrics</Text>
            <Text variant={TextVariant.BodySm}>
              Session: {session.sessionId?.slice(0, 8) || '—'}
            </Text>
          </Box>
          <Box twClassName="max-h-72">
            {rows.length > 0 ? (
              <ScrollView style={tw.style({ maxHeight: 288 })}>
                <Box twClassName="">
                  {rows}
                </Box>
              </ScrollView>
            ) : (
              <Box twClassName="px-3 py-4">
                <Text variant={TextVariant.BodySm}>No metrics yet</Text>
              </Box>
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default PerformanceMetricsPanel;

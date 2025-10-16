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
import { isTest } from '../../../util/test/utils';

const formatDuration = (ms?: number) =>
  typeof ms === 'number' ? `${ms.toFixed(0)} ms` : '—';

const formatTime = (ts?: number) =>
  ts ? new Date(ts).toLocaleTimeString() : '';

// Mock data for development when performance slice isn't available
const mockMetrics = [
  {
    eventName: 'App Startup Complete',
    timestamp: Date.now() - 8000,
    duration: 3250,
  },
  {
    eventName: 'Store Initialization',
    timestamp: Date.now() - 7000,
    duration: 850,
  },
  {
    eventName: 'Engine Initialization',
    timestamp: Date.now() - 5000,
    duration: 1420,
  },
  {
    eventName: 'UI Startup',
    timestamp: Date.now() - 3000,
    duration: 650,
  },
  {
    eventName: 'Navigation Initialization',
    timestamp: Date.now() - 2000,
    duration: 280,
  },
];

const mockSession = {
  sessionId: 'dev-session',
  startTime: Date.now() - 10000,
};

interface PerformanceMetric {
  eventName: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceSession {
  sessionId?: string;
  startTime?: number;
}

const PerformanceMetricsPanel: React.FC = () => {
  const tw = useTailwind();
  const [open, setOpen] = useState(false);
  
  // Try to get real performance data from Redux
  let metrics: PerformanceMetric[] = [];
  let session: PerformanceSession = { sessionId: 'none' };
  let dataSource = 'none';
  
  try {
    // Import selectors (now available in development too)
    const { 
      selectPerformanceMetrics, 
      selectPerformanceSession 
    } = require('../../../core/redux/slices/performance');
    
    const reduxMetrics = useSelector(selectPerformanceMetrics) as PerformanceMetric[] | undefined;
    const reduxSession = useSelector(selectPerformanceSession) as PerformanceSession | undefined;
    
    if (reduxMetrics && reduxMetrics.length > 0) {
      metrics = reduxMetrics;
      session = reduxSession || { sessionId: 'no-session' };
      dataSource = 'redux';
    } else {
      metrics = [];
      session = { sessionId: 'no-session' };
      dataSource = 'empty';
    }
  } catch (error) {
    metrics = [];
    session = { sessionId: 'error' };
    dataSource = 'error';
  }

  // Show all metrics (no filtering)
  const metricsNormalized = useMemo(() => metrics ?? [], [metrics]);

  const rows = useMemo(
    () => {
      const rowsData = [...metricsNormalized].reverse().slice(0, 50).map((m, idx) => {
        const isAppStartup = m.eventName === 'App Startup Complete';
        const metadata = m.metadata as Record<string, unknown> | undefined;
        const totalAppStartup = metadata?.totalAppStartupMs as number | undefined;
        const storeInitDuration = metadata?.storeInitDurationMs as number | undefined;
        const appServicesDuration = metadata?.appServicesDurationMs as number | undefined;
        
        return (
          <Box
            key={`${m.eventName}-${m.timestamp}-${idx}`}
            twClassName="px-3 py-2 border-b border-muted"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="mb-1"
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
              <Text variant={TextVariant.BodySm}>
                {isAppStartup && totalAppStartup 
                  ? formatDuration(totalAppStartup) 
                  : formatDuration(m.duration)}
              </Text>
            </Box>
            
            {/* Show breakdown for App Startup Complete */}
            {isAppStartup && (storeInitDuration || appServicesDuration) && (
              <Box twClassName="ml-6 mt-1 pl-3 border-l-2 border-muted">
                {storeInitDuration !== undefined && (
                  <Text variant={TextVariant.BodyXs} twClassName="text-muted">
                    └ Store Init: {formatDuration(storeInitDuration)}
                  </Text>
                )}
                {appServicesDuration !== undefined && (
                  <Text variant={TextVariant.BodyXs} twClassName="text-muted">
                    └ App Services: {formatDuration(appServicesDuration)}
                  </Text>
                )}
              </Box>
            )}
          </Box>
        );
      });
      
      return rowsData;
    },
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
            <Box twClassName="items-end">
              <Text variant={TextVariant.BodySm}>
                Session: {session?.sessionId?.slice(0, 8) || '—'}
              </Text>
              <Text variant={TextVariant.BodyXs}>
                {dataSource === 'redux' ? '🔴 Live Data' : 
                 dataSource === 'empty' ? '⏳ Waiting for traces...' : 
                 dataSource === 'error' ? '❌ Error' : '❓ Unknown'} ({metricsNormalized.length})
              </Text>
            </Box>
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
                <Text variant={TextVariant.BodySm}>
                  {dataSource === 'empty' ? 'Waiting for performance traces to be recorded...' : 
                   dataSource === 'error' ? 'Error loading performance data' : 
                   'No metrics available'}
                </Text>
                <Text variant={TextVariant.BodyXs}>
                  Traces will appear when app actions are performed
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default PerformanceMetricsPanel;

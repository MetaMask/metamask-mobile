import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import Svg, { Circle } from 'react-native-svg';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { selectRevocationSession } from '../../selectors';
import { useRevokeOrchestrator } from '../../hooks/useRevokeOrchestrator';
import Routes from '../../../../../constants/navigation/Routes';
import type { ChainBatchInfo } from '../../hooks/useBatchRevokeSupport';
import type { ChainProgressEntry } from '../../types';
import {
  getCurrentProcessingTransactionIndex,
  getTotalTransactionCount,
} from '../../utils/revocationProgress';

// Large spinner ring
const RING_SIZE = 72;
const RING_STROKE = 5;

// Small inline spinner for signing rows
const SMALL_RING_SIZE = 28;
const SMALL_RING_STROKE = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  spinnerSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 24,
  },
  smallRingContainer: {
    width: SMALL_RING_SIZE,
    height: SMALL_RING_SIZE,
  },
  progressTextBold: {
    marginTop: 4,
  },
  walletPrompt: {
    marginTop: 8,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowSubtitle: {
    marginTop: 2,
  },
});

interface RowData {
  key: string;
  title: string;
  subtitle: string;
  status: ChainProgressEntry['status'];
}

function buildRows(
  chainBreakdown: ChainBatchInfo[] | undefined,
  chainProgress: ChainProgressEntry[],
): RowData[] {
  const rows: RowData[] = [];

  for (const progress of chainProgress) {
    const chainInfo = chainBreakdown?.find(
      (c) => c.chainId === progress.chainId,
    );

    if (progress.isBatch) {
      rows.push({
        key: progress.chainId,
        title: strings('token_approvals.processing_batch_revoke', {
          chain: progress.chainName,
        }),
        subtitle: strings('token_approvals.processing_approvals_count', {
          count: progress.totalApprovals.toString(),
        }),
        status: progress.status,
      });
    } else {
      const approvals = chainInfo?.approvals ?? [];
      for (let i = 0; i < progress.totalApprovals; i++) {
        const approval = approvals[i];
        const tokenSymbol = approval?.asset?.symbol ?? `Token ${i + 1}`;

        let rowStatus: ChainProgressEntry['status'] = 'waiting';
        if (progress.status === 'done') {
          rowStatus = 'done';
        } else if (progress.status === 'failed') {
          if (i < progress.currentIndex) {
            rowStatus = 'done';
          } else if (i === progress.currentIndex) {
            rowStatus = 'failed';
          } else {
            rowStatus = 'waiting';
          }
        } else if (progress.status === 'signing') {
          if (i < progress.currentIndex) {
            rowStatus = 'done';
          } else if (i === progress.currentIndex) {
            rowStatus = 'signing';
          } else {
            rowStatus = 'waiting';
          }
        }

        rows.push({
          key: `${progress.chainId}-${i}`,
          title: strings('token_approvals.processing_sequential_revoke', {
            chain: progress.chainName,
            token: tokenSymbol,
          }),
          subtitle: strings('token_approvals.processing_x_of_y', {
            current: (i + 1).toString(),
            total: progress.totalApprovals.toString(),
          }),
          status: rowStatus,
        });
      }
    }
  }

  return rows;
}

// Shared rotation context so all spinners use one Animated.loop
const SharedRotationContext = React.createContext<Animated.Value | null>(null);

const SharedRotationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotateAnim]);

  return (
    <SharedRotationContext.Provider value={rotateAnim}>
      {children}
    </SharedRotationContext.Provider>
  );
};

const SpinningRing: React.FC<{
  size: number;
  stroke: number;
  arcRatio?: number;
  color: string;
  trackColor: string;
  containerStyle?: object;
}> = ({ size, stroke, arcRatio = 0.35, color, trackColor, containerStyle }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const sharedAnim = React.useContext(SharedRotationContext);

  // Fallback for usage outside the provider (shouldn't happen)
  const localAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = sharedAnim ?? localAnim;

  useEffect(() => {
    if (sharedAnim) return; // shared provider handles animation
    const animation = Animated.loop(
      Animated.timing(localAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [sharedAnim, localAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[containerStyle, { transform: [{ rotate }] }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * arcRatio} ${circumference * (1 - arcRatio)}`}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

const StatusIcon: React.FC<{
  status: ChainProgressEntry['status'];
}> = ({ status }) => {
  const { colors } = useTheme();

  if (status === 'done') {
    return (
      <View
        style={[
          styles.statusIconContainer,
          { backgroundColor: colors.success.default },
        ]}
      >
        <Icon
          name={IconName.Check}
          size={IconSize.Xs}
          color={IconColor.Inverse}
        />
      </View>
    );
  }

  if (status === 'signing' || status === 'waiting') {
    const spinnerColor =
      status === 'signing' ? colors.primary.default : colors.icon.muted;
    const spinnerTrack =
      status === 'signing'
        ? colors.primary.muted
        : colors.background.alternative;
    return (
      <View style={styles.statusIconContainer}>
        <SpinningRing
          size={SMALL_RING_SIZE}
          stroke={SMALL_RING_STROKE}
          arcRatio={0.3}
          color={spinnerColor}
          trackColor={spinnerTrack}
          containerStyle={styles.smallRingContainer}
        />
      </View>
    );
  }

  // failed
  return (
    <View
      style={[
        styles.statusIconContainer,
        { backgroundColor: colors.error.muted },
      ]}
    >
      <Icon name={IconName.Danger} size={IconSize.Md} color={IconColor.Error} />
    </View>
  );
};

function getStatusText(status: ChainProgressEntry['status']): string {
  switch (status) {
    case 'done':
      return strings('token_approvals.processing_status_done');
    case 'signing':
      return strings('token_approvals.processing_status_signing');
    case 'failed':
      return strings('token_approvals.processing_status_failed');
    default:
      return strings('token_approvals.processing_status_waiting');
  }
}

function getStatusColor(status: ChainProgressEntry['status']): TextColor {
  switch (status) {
    case 'done':
      return TextColor.Success;
    case 'signing':
      return TextColor.Primary;
    case 'failed':
      return TextColor.Error;
    default:
      return TextColor.Alternative;
  }
}

const RevokeProcessingScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { startRevocation } = useRevokeOrchestrator();
  const session = useSelector(selectRevocationSession);
  const hasStartedRef = useRef(false);

  const { approvalIds, chainBreakdown } = (route.params as {
    approvalIds: string[];
    chainBreakdown?: ChainBatchInfo[];
  }) ?? { approvalIds: [] };

  // Disable hardware back button during processing
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => session.isActive,
    );
    return () => backHandler.remove();
  }, [session.isActive]);

  // Start revocation on mount
  useEffect(() => {
    if (hasStartedRef.current || approvalIds.length === 0) return;
    hasStartedRef.current = true;
    startRevocation(approvalIds, chainBreakdown);
  }, [approvalIds, chainBreakdown, startRevocation]);

  // Navigate to result when session ends
  useEffect(() => {
    if (
      hasStartedRef.current &&
      !session.isActive &&
      session.totalApprovals > 0
    ) {
      (
        navigation as StackNavigationProp<Record<string, undefined | object>>
      ).replace(Routes.TOKEN_APPROVALS.REVOKE_RESULT);
    }
  }, [session.isActive, session.totalApprovals, navigation]);

  const currentTxIndex = getCurrentProcessingTransactionIndex(
    session.chainProgress,
  );
  const totalTxCount = getTotalTransactionCount(session.chainProgress);

  const rows = useMemo(
    () => buildRows(chainBreakdown, session.chainProgress),
    [chainBreakdown, session.chainProgress],
  );

  return (
    <SharedRotationProvider>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
      >
        {/* Header title */}
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.headerTitle}
        >
          {strings('token_approvals.processing_title')}
        </Text>

        {/* Spinner section */}
        <View style={styles.spinnerSection}>
          <SpinningRing
            size={RING_SIZE}
            stroke={RING_STROKE}
            color={colors.primary.default}
            trackColor={colors.primary.muted}
            containerStyle={styles.ringContainer}
          />
          <Text
            variant={TextVariant.BodyMDBold}
            color={TextColor.Default}
            style={styles.progressTextBold}
          >
            {strings('token_approvals.processing_tx_of', {
              current: currentTxIndex.toString(),
              total: totalTxCount.toString(),
            })}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.walletPrompt}
          >
            {strings('token_approvals.processing_confirm_wallet')}
          </Text>
        </View>

        {/* Chain/approval progress card */}
        <View
          style={[styles.card, { backgroundColor: colors.background.muted }]}
        >
          {rows.map((row, index) => (
            <React.Fragment key={row.key}>
              {index > 0 && (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: colors.border.muted },
                  ]}
                />
              )}
              <View style={styles.row}>
                <StatusIcon
                  key={`${row.key}-${row.status}`}
                  status={row.status}
                />
                <View style={styles.rowContent}>
                  <Text
                    variant={TextVariant.BodyMDBold}
                    color={TextColor.Default}
                  >
                    {row.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    style={styles.rowSubtitle}
                  >
                    {row.subtitle}
                  </Text>
                </View>
                <Text
                  variant={TextVariant.BodySM}
                  color={getStatusColor(row.status)}
                >
                  {getStatusText(row.status)}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </SafeAreaView>
    </SharedRotationProvider>
  );
};

export default RevokeProcessingScreen;

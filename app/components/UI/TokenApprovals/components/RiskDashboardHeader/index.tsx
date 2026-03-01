import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { ApprovalItem, Verdict } from '../../types';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  innerContainer: {
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextColumn: {
    flex: 1,
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegmentMalicious: {
    height: '100%',
  },
  progressSegmentWarning: {
    height: '100%',
  },
  progressSegmentSafe: {
    height: '100%',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statBlock: {
    gap: 2,
  },
  statBlockRight: {
    gap: 2,
    alignItems: 'flex-end',
  },
  countsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cleanContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cleanInner: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  cleanIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});

interface RiskDashboardHeaderProps {
  approvals: ApprovalItem[];
  onRevokeAllRisky: () => void;
  isProcessing?: boolean;
}

const RiskDashboardHeader: React.FC<RiskDashboardHeaderProps> = ({
  approvals,
  onRevokeAllRisky,
  isProcessing = false,
}) => {
  const { colors } = useTheme();

  const stats = useMemo(() => {
    let maliciousCount = 0;
    let warningCount = 0;
    let benignCount = 0;
    let riskyExposure = 0;
    let totalExposure = 0;

    for (const a of approvals) {
      totalExposure += a.exposure_usd;
      if (a.verdict === Verdict.Malicious) {
        maliciousCount++;
        riskyExposure += a.exposure_usd;
      } else if (a.verdict === Verdict.Warning) {
        warningCount++;
        riskyExposure += a.exposure_usd;
      } else {
        benignCount++;
      }
    }

    const total = approvals.length;
    const riskyCount = maliciousCount + warningCount;

    return {
      maliciousCount,
      warningCount,
      benignCount,
      riskyCount,
      total,
      riskyExposure,
      totalExposure,
      maliciousPct: total > 0 ? (maliciousCount / total) * 100 : 0,
      warningPct: total > 0 ? (warningCount / total) * 100 : 0,
      safePct: total > 0 ? (benignCount / total) * 100 : 0,
    };
  }, [approvals]);

  const formatUsd = (value: number) =>
    `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (stats.total === 0) return null;

  // Clean state: no risky approvals
  if (stats.riskyCount === 0) {
    return (
      <View
        style={[
          styles.cleanContainer,
          { backgroundColor: colors.success.muted },
        ]}
      >
        <View style={styles.cleanInner}>
          <View
            style={[
              styles.cleanIconCircle,
              { backgroundColor: colors.success.default + '22' },
            ]}
          >
            <Icon
              name={IconName.SecurityTick}
              size={IconSize.Lg}
              color={IconColor.Success}
            />
          </View>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Success}>
            {strings('token_approvals.dashboard_clean_title')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('token_approvals.dashboard_clean_subtitle', {
              count: stats.total.toString(),
            })}
          </Text>
        </View>
      </View>
    );
  }

  // Risky state
  return (
    <View style={[styles.container, { backgroundColor: colors.error.muted }]}>
      <View style={styles.innerContainer}>
        {/* Header: icon + title */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.error.default + '22' },
            ]}
          >
            <Icon
              name={IconName.SecuritySearch}
              size={IconSize.Md}
              color={IconColor.Error}
            />
          </View>
          <View style={styles.headerTextColumn}>
            <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
              {strings('token_approvals.dashboard_title')}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('token_approvals.dashboard_at_risk', {
                count: stats.riskyCount.toString(),
                total: stats.total.toString(),
              })}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.success.default + '33' },
            ]}
          >
            {stats.maliciousPct > 0 && (
              <View
                style={[
                  styles.progressSegmentMalicious,
                  {
                    width: `${stats.maliciousPct}%`,
                    backgroundColor: colors.error.default,
                  },
                ]}
              />
            )}
            {stats.warningPct > 0 && (
              <View
                style={[
                  styles.progressSegmentWarning,
                  {
                    width: `${stats.warningPct}%`,
                    backgroundColor: colors.warning.default,
                  },
                ]}
              />
            )}
            {stats.safePct > 0 && (
              <View
                style={[
                  styles.progressSegmentSafe,
                  {
                    width: `${stats.safePct}%`,
                    backgroundColor: colors.success.default,
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.progressLabelsRow}>
            <View style={styles.countsRow}>
              {stats.maliciousCount > 0 && (
                <View style={styles.countPill}>
                  <View
                    style={[
                      styles.countDot,
                      { backgroundColor: colors.error.default },
                    ]}
                  />
                  <Text
                    variant={TextVariant.BodyXS}
                    color={TextColor.Alternative}
                  >
                    {stats.maliciousCount}{' '}
                    {strings('token_approvals.filter_malicious').toLowerCase()}
                  </Text>
                </View>
              )}
              {stats.warningCount > 0 && (
                <View style={styles.countPill}>
                  <View
                    style={[
                      styles.countDot,
                      { backgroundColor: colors.warning.default },
                    ]}
                  />
                  <Text
                    variant={TextVariant.BodyXS}
                    color={TextColor.Alternative}
                  >
                    {stats.warningCount}{' '}
                    {strings('token_approvals.filter_warning').toLowerCase()}
                  </Text>
                </View>
              )}
              <View style={styles.countPill}>
                <View
                  style={[
                    styles.countDot,
                    { backgroundColor: colors.success.default },
                  ]}
                />
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {stats.benignCount}{' '}
                  {strings('token_approvals.dashboard_safe').toLowerCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
              {strings('token_approvals.dashboard_exposed')}
            </Text>
            <Text variant={TextVariant.HeadingSM} color={TextColor.Error}>
              {formatUsd(stats.riskyExposure)}
            </Text>
          </View>
          <View style={styles.statBlockRight}>
            <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
              {strings('token_approvals.dashboard_total_approved')}
            </Text>
            <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
              {formatUsd(stats.totalExposure)}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          isDanger
          label={strings('token_approvals.dashboard_revoke_risky', {
            count: stats.riskyCount.toString(),
          })}
          onPress={onRevokeAllRisky}
          width={ButtonWidthTypes.Full}
          isDisabled={isProcessing}
        />
      </View>
    </View>
  );
};

export default RiskDashboardHeader;

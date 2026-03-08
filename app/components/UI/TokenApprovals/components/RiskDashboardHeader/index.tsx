import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
import { ApprovalItem, Verdict } from '../../types';
import { formatUsd } from '../../utils/formatUsd';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  exposureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  exposureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
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
    let riskyExposure = 0;

    for (const a of approvals) {
      const exposureUsd = Number(a.exposure_usd) || 0;
      if (a.verdict === Verdict.Malicious) {
        maliciousCount++;
        riskyExposure += exposureUsd;
      } else if (a.verdict === Verdict.Warning) {
        warningCount++;
        riskyExposure += exposureUsd;
      }
    }

    const total = approvals.length;
    const riskyCount = maliciousCount + warningCount;

    return {
      maliciousCount,
      riskyCount,
      total,
      riskyExposure,
    };
  }, [approvals]);

  if (stats.total === 0) return null;

  if (stats.riskyCount === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.cleanRow}>
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Sm}
            color={IconColor.Success}
          />
          <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
            {strings('token_approvals.dashboard_clean_title')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Exposure summary card */}
      <View
        style={[
          styles.exposureCard,
          { backgroundColor: colors.background.section },
        ]}
      >
        <View style={styles.exposureLeft}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Md}
            color={IconColor.Warning}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {formatUsd(stats.riskyExposure)}{' '}
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {strings('token_approvals.dashboard_exposed')}
            </Text>
          </Text>
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('token_approvals.dashboard_need_review', {
            count: stats.riskyCount.toString(),
            total: stats.total.toString(),
          })}
        </Text>
      </View>

      {/* Review malicious approvals CTA */}
      {stats.maliciousCount > 0 && (
        <TouchableOpacity
          style={[
            styles.reviewButton,
            { backgroundColor: colors.error.default },
          ]}
          onPress={onRevokeAllRisky}
          disabled={isProcessing}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'token_approvals.dashboard_review_malicious',
            { count: stats.maliciousCount.toString() },
          )}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('token_approvals.dashboard_review_malicious', {
              count: stats.maliciousCount.toString(),
            })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default RiskDashboardHeader;

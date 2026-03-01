import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { ApprovalItem, Verdict } from '../../types';
import { formatUsd } from '../../utils/formatUsd';

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
  const tw = useTailwind();

  const stats = useMemo(() => {
    let maliciousCount = 0;
    let warningCount = 0;
    let benignCount = 0;
    let riskyExposure = 0;
    let totalExposure = 0;

    for (const a of approvals) {
      const exposureUsd = Number(a.exposure_usd) || 0;
      totalExposure += exposureUsd;
      if (a.verdict === Verdict.Malicious) {
        maliciousCount++;
        riskyExposure += exposureUsd;
      } else if (a.verdict === Verdict.Warning) {
        warningCount++;
        riskyExposure += exposureUsd;
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
    };
  }, [approvals]);

  if (stats.total === 0) return null;

  if (stats.riskyCount === 0) {
    return (
      <Box twClassName="mx-4 mt-1 mb-3 rounded-2xl overflow-hidden bg-success-muted">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
          twClassName="px-4 py-4"
        >
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Md}
            color={IconColor.SuccessDefault}
          />
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {strings('token_approvals.dashboard_clean_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('token_approvals.dashboard_clean_subtitle', {
                count: stats.total.toString(),
              })}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box twClassName="mx-4 mt-1 mb-3 rounded-2xl overflow-hidden bg-background-alternative">
      <Box twClassName="p-4" gap={4}>
        {/* Risk indicator */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <Box
            style={tw.style(
              'w-10 h-10 rounded-full items-center justify-center bg-error-muted',
            )}
          >
            <Icon
              name={IconName.Danger}
              size={IconSize.Md}
              color={IconColor.ErrorDefault}
            />
          </Box>
          <Text
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('token_approvals.dashboard_at_risk', {
              count: stats.riskyCount.toString(),
              total: stats.total.toString(),
            })}
          </Text>
        </Box>

        {/* Stats */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Start}
        >
          <Box gap={1}>
            <Text
              variant={TextVariant.HeadingSm}
              color={TextColor.ErrorDefault}
            >
              {formatUsd(stats.riskyExposure)}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('token_approvals.dashboard_exposed')}
            </Text>
          </Box>
          <Box gap={1} twClassName="items-end">
            <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
              {formatUsd(stats.totalExposure)}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('token_approvals.dashboard_total_approved')}
            </Text>
          </Box>
        </Box>

        {/* CTA */}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isDanger
          onPress={onRevokeAllRisky}
          isFullWidth
          isDisabled={isProcessing}
        >
          {strings('token_approvals.dashboard_revoke_risky', {
            count: stats.riskyCount.toString(),
          })}
        </Button>
      </Box>
    </Box>
  );
};

export default RiskDashboardHeader;

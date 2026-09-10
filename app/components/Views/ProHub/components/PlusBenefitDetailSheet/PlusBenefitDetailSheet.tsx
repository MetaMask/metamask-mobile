import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePlusBenefitDetail } from '../../../../../hooks/usePlusBenefitDetail';
import { useMoneyAccountPlusBenefits } from '../../../../../hooks/useMoneyAccountPlusBenefits';
import type { TradeAllowanceKind } from '../../ProHub.constants';
import {
  PlusBenefitDetailStatus,
  type PlusBenefitCtaRoute,
  type PlusBenefitDetail,
  type PlusBenefitDetailId,
} from '../MemberPricingOnTrades/mapPlusBenefitToDetail';
import { PlusBenefitDetailSheetTestIds } from './PlusBenefitDetailSheet.testIds';

interface PlusBenefitDetailSheetProps {
  detail: PlusBenefitDetail;
  onClose: () => void;
  onRetry: () => void;
  onCta: (route: PlusBenefitCtaRoute) => void;
}

const STATUS_SEVERITY: Record<PlusBenefitDetailStatus, TagSeverity> = {
  [PlusBenefitDetailStatus.Available]: TagSeverity.Success,
  [PlusBenefitDetailStatus.Exhausted]: TagSeverity.Neutral,
  [PlusBenefitDetailStatus.Unavailable]: TagSeverity.Neutral,
  [PlusBenefitDetailStatus.NotIncluded]: TagSeverity.Neutral,
};

const formatAmount = (amount: number, kind: TradeAllowanceKind): string => {
  if (kind === 'currency') {
    return strings('pro_hub.member_pricing.allowance_currency', {
      amount: amount.toLocaleString('en-US'),
    });
  }

  return String(amount);
};

const formatLimit = (amount: number, kind: TradeAllowanceKind): string => {
  if (kind === 'currency') {
    return formatAmount(amount, kind);
  }

  const countKey =
    amount === 1
      ? 'pro_hub.member_pricing.allowance_count_one'
      : 'pro_hub.member_pricing.allowance_count_other';

  return strings(countKey, { count: amount });
};

const buildAccessibilityLabel = (detail: PlusBenefitDetail): string => {
  const title = strings(detail.titleKey);
  const status = strings(`pro_hub.benefit_detail.status.${detail.status}`);

  if (
    detail.used === undefined ||
    detail.allowance === undefined ||
    detail.kind === undefined
  ) {
    return strings('pro_hub.benefit_detail.accessibility_status_only', {
      title,
      status,
    });
  }

  return strings('pro_hub.benefit_detail.accessibility', {
    title,
    status,
    used: formatAmount(detail.used, detail.kind),
    limit: formatLimit(detail.allowance, detail.kind),
  });
};

const PlusBenefitDetailSheet = ({
  detail,
  onClose,
  onRetry,
  onCta,
}: PlusBenefitDetailSheetProps) => {
  const handleCta = useCallback(() => {
    if (detail.ctaRoute) {
      onCta(detail.ctaRoute);
    }
  }, [detail.ctaRoute, onCta]);

  const handleLearnMore = useCallback(() => {
    if (detail.learnMoreUrl) {
      Linking.openURL(detail.learnMoreUrl);
    }
  }, [detail.learnMoreUrl]);

  const accessibilityLabel = buildAccessibilityLabel(detail);

  return (
    <BottomSheet onClose={onClose} testID={PlusBenefitDetailSheetTestIds.SHEET}>
      <Box
        twClassName="p-4 gap-y-4"
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          testID={PlusBenefitDetailSheetTestIds.TITLE}
        >
          {strings(detail.titleKey)}
        </Text>

        <Tag
          severity={STATUS_SEVERITY[detail.status]}
          testID={PlusBenefitDetailSheetTestIds.STATUS}
        >
          {strings(`pro_hub.benefit_detail.status.${detail.status}`)}
        </Tag>

        {detail.used !== undefined && detail.kind ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            testID={PlusBenefitDetailSheetTestIds.USED}
          >
            {strings('pro_hub.benefit_detail.used', {
              used: formatAmount(detail.used, detail.kind),
            })}
          </Text>
        ) : null}

        {detail.remaining !== undefined && detail.kind ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            testID={PlusBenefitDetailSheetTestIds.REMAINING}
          >
            {strings('pro_hub.benefit_detail.remaining', {
              remaining: formatAmount(detail.remaining, detail.kind),
            })}
          </Text>
        ) : null}

        {detail.allowance !== undefined && detail.kind ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            testID={PlusBenefitDetailSheetTestIds.LIMIT}
          >
            {strings('pro_hub.benefit_detail.limit', {
              limit: formatLimit(detail.allowance, detail.kind),
            })}
          </Text>
        ) : null}

        {detail.resetsOn ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={PlusBenefitDetailSheetTestIds.RESETS_ON}
          >
            {strings('pro_hub.member_pricing.resets_on', {
              date: detail.resetsOn,
            })}
          </Text>
        ) : null}

        {detail.feePercent ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={PlusBenefitDetailSheetTestIds.FEE}
          >
            {strings('pro_hub.benefit_detail.fee', {
              percent: detail.feePercent,
            })}
          </Text>
        ) : null}

        {detail.apyPercentFormatted ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={PlusBenefitDetailSheetTestIds.APY}
          >
            {strings('pro_hub.benefit_detail.apy', {
              apy: detail.apyPercentFormatted,
            })}
          </Text>
        ) : null}

        {detail.learnMoreUrl ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextDefault}
            twClassName="self-start border-b border-border-default"
            onPress={handleLearnMore}
            testID={PlusBenefitDetailSheetTestIds.LEARN_MORE}
          >
            {strings(
              'pro_subscription.benefits_description.protection.learn_more',
            )}
          </Text>
        ) : null}

        {detail.showRetry ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={onRetry}
            testID={PlusBenefitDetailSheetTestIds.RETRY}
          >
            {strings('pro_hub.member_pricing.retry')}
          </Button>
        ) : null}

        {detail.ctaRoute && detail.ctaLabelKey ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleCta}
            isFullWidth
            testID={PlusBenefitDetailSheetTestIds.CTA}
          >
            {strings(detail.ctaLabelKey)}
          </Button>
        ) : null}
      </Box>
    </BottomSheet>
  );
};

export default PlusBenefitDetailSheet;

interface PlusBenefitDetailSheetHostProps {
  id: PlusBenefitDetailId;
  onClose: () => void;
  onNavigate: (route: PlusBenefitCtaRoute) => void;
}

export const PlusBenefitDetailSheetHost = ({
  id,
  onClose,
  onNavigate,
}: PlusBenefitDetailSheetHostProps) => {
  const detail = usePlusBenefitDetail(id);
  const { retry } = useMoneyAccountPlusBenefits();

  const handleCta = useCallback(
    (route: PlusBenefitCtaRoute) => {
      onNavigate(route);
      onClose();
    },
    [onClose, onNavigate],
  );

  if (!detail) {
    return null;
  }

  return (
    <PlusBenefitDetailSheet
      detail={detail}
      onClose={onClose}
      onRetry={retry}
      onCta={handleCta}
    />
  );
};

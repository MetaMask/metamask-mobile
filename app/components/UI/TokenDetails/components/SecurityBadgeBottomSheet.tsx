import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonIconSize,
  BottomSheetHeader,
  FontWeight,
  Text as DSText,
  TextVariant as DSTextVariant,
  TextColor as DSTextColor,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconName,
  IconSize,
  IconColor,
  IconAlert,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  getFeatureTags,
  getResultTypeConfig,
} from '../../SecurityTrust/utils/securityUtils';
import type { TokenSecurityFeature } from '../../SecurityTrust/types';

export interface SecurityBadgeBottomSheetParams {
  icon: IconName;
  iconColor: IconColor;
  title: string;
  description: string;
  onProceed?: () => void;
  source: string;
  severity?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  chainId?: string;
  features?: TokenSecurityFeature[];
}

type SecurityBadgeBottomSheetRouteProp = RouteProp<
  { SecurityBadgeBottomSheet: SecurityBadgeBottomSheetParams },
  'SecurityBadgeBottomSheet'
>;

const SecurityBadgeBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<SecurityBadgeBottomSheetRouteProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const {
    icon,
    iconColor,
    title,
    description,
    onProceed,
    source,
    severity,
    tokenAddress,
    tokenSymbol,
    chainId,
    features,
  } = route.params;

  // Get feature tags for Malicious and Warning types only (max 5)
  const featureTags = useMemo(() => {
    if (
      features &&
      features.length > 0 &&
      (severity === 'Malicious' || severity === 'Warning')
    ) {
      // Use showAll=true to get all tags, then manually slice to 5
      const result = getFeatureTags(features, severity, true);
      const maxTags = 5;
      return result.tags.slice(0, maxTags);
    }
    return [];
  }, [features, severity]);

  // Get icon configuration for feature tags
  const { iconAlertSeverity } = useMemo(
    () => getResultTypeConfig(severity),
    [severity],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_OPENED)
        .addProperties({
          source,
          severity,
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          chain_id: chainId,
        })
        .build(),
    );
  }, [
    chainId,
    createEventBuilder,
    severity,
    source,
    tokenAddress,
    tokenSymbol,
    trackEvent,
  ]);

  const trackAction = useCallback(
    (action: 'proceed' | 'cancel') => {
      if (!onProceed) return;
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_ACTION_TAKEN,
        )
          .addProperties({
            action,
            source,
            severity,
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            chain_id: chainId,
          })
          .build(),
      );
    },
    [
      chainId,
      createEventBuilder,
      onProceed,
      severity,
      source,
      tokenAddress,
      tokenSymbol,
      trackEvent,
    ],
  );

  const handleClose = useCallback(() => {
    trackAction('cancel');
    sheetRef.current?.onCloseBottomSheet();
  }, [trackAction]);

  const handleProceed = useCallback(() => {
    trackAction('proceed');
    sheetRef.current?.onCloseBottomSheet();
    onProceed?.();
  }, [onProceed, trackAction]);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ size: ButtonIconSize.Sm }}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="self-stretch px-4 gap-4"
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="self-stretch"
        >
          {iconAlertSeverity && severity !== 'Verified' ? (
            <IconAlert severity={iconAlertSeverity} size={IconSize.Xl} />
          ) : (
            <Icon name={icon} size={IconSize.Xl} color={iconColor} />
          )}
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="self-stretch"
          >
            <DSText
              variant={DSTextVariant.HeadingMd}
              color={DSTextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              twClassName="text-center"
            >
              {title}
            </DSText>
            {severity !== 'Malicious' ? (
              <DSText
                variant={DSTextVariant.BodyMd}
                color={DSTextColor.TextAlternative}
                twClassName="text-center mb-2"
              >
                {description}
              </DSText>
            ) : (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Start}
                twClassName="self-stretch py-3 pl-6 pr-4 gap-3 rounded-2xl bg-error-muted mt-3"
              >
                <Box twClassName="pt-[2px]">
                  {iconAlertSeverity && (
                    <IconAlert
                      severity={iconAlertSeverity}
                      size={IconSize.Md}
                    />
                  )}
                </Box>
                <Box twClassName="flex-1">
                  <DSText
                    variant={DSTextVariant.BodyMd}
                    color={DSTextColor.TextDefault}
                  >
                    {strings(
                      'security_trust.malicious_token_banner_description',
                      {
                        symbol: tokenSymbol,
                      },
                    )}
                  </DSText>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        {featureTags.length > 0 && (
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Start}
            twClassName="self-stretch mb-4"
            gap={4}
          >
            {featureTags.map((tag) => (
              <Box
                key={tag.label}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="w-full"
                gap={3}
              >
                {iconAlertSeverity && (
                  <IconAlert severity={iconAlertSeverity} size={IconSize.Md} />
                )}
                <DSText
                  variant={DSTextVariant.BodyMd}
                  color={DSTextColor.TextDefault}
                >
                  {tag.label}
                </DSText>
              </Box>
            ))}
          </Box>
        )}
        {onProceed ? (
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Start}
            twClassName="self-stretch gap-4"
          >
            <Button
              variant={ButtonVariant.Secondary}
              isFullWidth
              onPress={handleProceed}
              twClassName={severity === 'Malicious' ? 'bg-error-default' : ''}
            >
              <DSText
                variant={DSTextVariant.BodyMd}
                color={
                  severity === 'Malicious'
                    ? DSTextColor.PrimaryInverse
                    : DSTextColor.TextDefault
                }
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.continue_anyway')}
              </DSText>
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              isFullWidth
              onPress={handleClose}
            >
              {strings('security_trust.cancel')}
            </Button>
          </Box>
        ) : (
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            onPress={handleClose}
          >
            <DSText
              variant={DSTextVariant.BodyMd}
              color={DSTextColor.PrimaryInverse}
              fontWeight={FontWeight.Medium}
              twClassName="text-center"
            >
              {strings('security_trust.got_it')}
            </DSText>
          </Button>
        )}
      </Box>
    </BottomSheet>
  );
};

SecurityBadgeBottomSheet.displayName = 'SecurityBadgeBottomSheet';

export default SecurityBadgeBottomSheet;

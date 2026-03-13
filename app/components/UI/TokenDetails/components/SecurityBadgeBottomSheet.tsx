import React, { useCallback, useEffect, useRef } from 'react';
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
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';

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
  } = route.params;

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
        closeButtonProps={{ size: ButtonIconSize.Lg }}
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
          <Icon name={icon} size={IconSize.Xl} color={iconColor} />
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="self-stretch"
          >
            <DSText
              variant={DSTextVariant.HeadingLg}
              color={DSTextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              twClassName="text-center"
            >
              {title}
            </DSText>
            <DSText
              variant={DSTextVariant.BodyMd}
              color={DSTextColor.TextAlternative}
              twClassName="text-center mb-2"
            >
              {description}
            </DSText>
          </Box>
        </Box>
        {onProceed ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            twClassName="self-stretch flex-wrap gap-4"
          >
            <Button
              variant={ButtonVariant.Secondary}
              twClassName="flex-1"
              onPress={handleProceed}
            >
              {strings('security_trust.proceed')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              twClassName="flex-1"
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

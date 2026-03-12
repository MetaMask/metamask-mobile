import React, { useCallback, useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
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
}

type SecurityBadgeBottomSheetRouteProp = RouteProp<
  { SecurityBadgeBottomSheet: SecurityBadgeBottomSheetParams },
  'SecurityBadgeBottomSheet'
>;

const SecurityBadgeBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<SecurityBadgeBottomSheetRouteProp>();

  const { icon, iconColor, title, description, onProceed } = route.params;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleProceed = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onProceed?.();
  }, [onProceed]);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ size: ButtonIconSize.Sm }}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="self-stretch px-4 pt-6 pb-8 gap-4"
      >
        <Icon name={icon} size={IconSize.Xl} color={iconColor} />
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          gap={3}
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
          <DSText
            variant={DSTextVariant.BodyMd}
            color={DSTextColor.TextAlternative}
            twClassName="text-center"
          >
            {description}
          </DSText>
        </Box>
        {onProceed ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            twClassName="self-stretch flex-wrap gap-4 pt-4"
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
            {strings('security_trust.got_it')}
          </Button>
        )}
      </Box>
    </BottomSheet>
  );
};

SecurityBadgeBottomSheet.displayName = 'SecurityBadgeBottomSheet';

export default SecurityBadgeBottomSheet;

import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MoneyProtectWalletSheetTestIds } from './MoneyProtectWalletSheet.testIds';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  benefitIcon: {
    width: 24,
    alignItems: 'flex-start',
  },
});

const BENEFITS = [
  {
    icon: IconName.FaceId,
    labelKey: 'money.passkeys.biometrics_title',
  },
  {
    icon: IconName.Mobile,
    labelKey: 'money.passkeys.sync_title',
  },
  {
    icon: IconName.SecurityKey,
    labelKey: 'money.passkeys.verify_title',
  },
] as const;

const MoneyProtectWalletSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleNotNow = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleAddPasskey = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      });
    });
  }, [navigation]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      keyboardAvoidingViewEnabled={false}
      testID={MoneyProtectWalletSheetTestIds.CONTAINER}
    >
      <BottomSheetHeader onClose={handleNotNow}>
        {strings('money.protect_wallet_sheet.title')}
      </BottomSheetHeader>
      <Box style={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mb-2"
        >
          {strings('money.passkeys.empty_description')}
        </Text>
        <Box twClassName="py-2">
          {BENEFITS.map(({ icon, labelKey }) => (
            <Box
              key={labelKey}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              gap={3}
              twClassName="py-3"
            >
              <Box style={styles.benefitIcon} twClassName="pt-0.5">
                <Icon
                  name={icon}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              </Box>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="flex-1"
              >
                {strings(labelKey)}
              </Text>
            </Box>
          ))}
        </Box>
        <Box twClassName="gap-3 pt-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleAddPasskey}
            testID={MoneyProtectWalletSheetTestIds.ADD_PASSKEY_BUTTON}
          >
            {strings('money.protect_wallet_sheet.add_passkey')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleNotNow}
            testID={MoneyProtectWalletSheetTestIds.NOT_NOW_BUTTON}
          >
            {strings('money.protect_wallet_sheet.not_now')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default MoneyProtectWalletSheet;

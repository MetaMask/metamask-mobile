import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
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
import type { MoneyModalsNavigationParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  leftAlignedText: {
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  centeredText: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
});

const MoneySecurityInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<MoneyModalsNavigationParamList, 'MoneySecurityInfoSheet'>
    >();
  const isDisableConfirmation =
    route.params?.variant === 'disable-transaction-verification';
  const defaultMethod =
    route.params?.defaultMethod ??
    strings('money.security.default_method_passkeys');

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleDisable = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.MONEY.SECURITY_VERIFICATION, {
        action: { type: 'disable-transaction-verification' },
      });
    });
  }, [navigation]);

  if (isDisableConfirmation) {
    return (
      <BottomSheet
        ref={sheetRef}
        goBack={() => navigation.goBack()}
        keyboardAvoidingViewEnabled={false}
      >
        <Box style={styles.content}>
          <Box alignItems={BoxAlignItems.Center} twClassName="gap-3">
            <Icon
              name={IconName.Warning}
              size={IconSize.Xl}
              color={IconColor.ErrorDefault}
            />
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              style={styles.centeredText}
            >
              {strings('money.security.disable_2fa_title')}
            </Text>
          </Box>

          <Box twClassName="mt-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.leftAlignedText}
            >
              {strings('money.security.disable_2fa_description')}
            </Text>
          </Box>

          <Box gap={3} twClassName="mt-6">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleDisable}
              twClassName="bg-error-default"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.ErrorInverse}
                fontWeight={FontWeight.Medium}
              >
                {strings('money.security.disable_2fa_confirm')}
              </Text>
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={closeSheet}
              twClassName="bg-muted"
            >
              {strings('money.security.disable_2fa_cancel')}
            </Button>
          </Box>
        </Box>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      keyboardAvoidingViewEnabled={false}
    >
      <Box style={styles.content}>
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-3">
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Xl}
            color={IconColor.SuccessDefault}
          />
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            style={styles.centeredText}
          >
            {strings('money.security.info_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.leftAlignedText}
          >
            {strings('money.security.info_description', {
              method: defaultMethod,
            })}
          </Text>
        </Box>
        <Box twClassName="mt-6">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={closeSheet}
          >
            {strings('money.security.got_it')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default MoneySecurityInfoSheet;

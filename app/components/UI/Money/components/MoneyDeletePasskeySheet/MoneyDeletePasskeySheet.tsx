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
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
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
import type { MoneyModalsNavigationParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { MoneyDeletePasskeySheetTestIds } from './MoneyDeletePasskeySheet.testIds';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  centeredText: {
    textAlign: 'center',
  },
  description: {
    alignSelf: 'stretch',
  },
});

const MoneyDeletePasskeySheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<MoneyModalsNavigationParamList, 'MoneyDeletePasskeySheet'>
    >();
  const { passkeys } = useMoneyFinishSetup();
  const { hasAlternativeSecurityMethod } = useMoneySecurityMethods();
  const canDelete = passkeys.length > 1 || hasAlternativeSecurityMethod;

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleDelete = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.MONEY.SECURITY_VERIFICATION, {
        action: {
          type: 'delete-passkey',
          passkeyIndex: route.params.passkeyIndex,
        },
      });
    });
  }, [navigation, route.params.passkeyIndex]);

  const isCannotDelete = !canDelete;

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      keyboardAvoidingViewEnabled={false}
      testID={MoneyDeletePasskeySheetTestIds.CONTAINER}
    >
      <Box style={styles.content}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.End}
        >
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={closeSheet}
            accessibilityLabel={strings('money.passkey_details.cancel')}
            testID={MoneyDeletePasskeySheetTestIds.CLOSE_BUTTON}
          />
        </Box>

        <>
          <Box alignItems={BoxAlignItems.Center} twClassName="px-2 pt-6 gap-4">
            <Icon
              name={IconName.Error}
              size={IconSize.Xl}
              color={IconColor.ErrorDefault}
            />
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              style={styles.centeredText}
            >
              {strings(
                isCannotDelete
                  ? 'money.passkey_details.cannot_delete_title'
                  : 'money.passkey_details.delete_title',
              )}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Regular}
              style={styles.description}
            >
              {strings(
                isCannotDelete
                  ? 'money.passkey_details.cannot_delete_description'
                  : 'money.passkey_details.delete_description',
              )}
            </Text>
          </Box>

          {isCannotDelete ? (
            <Box twClassName="mt-6">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={closeSheet}
              >
                {strings('money.passkey_details.got_it')}
              </Button>
            </Box>
          ) : (
            <Box gap={3} twClassName="mt-6">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={handleDelete}
                testID={MoneyDeletePasskeySheetTestIds.CONFIRM_BUTTON}
                twClassName="bg-error-default"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.ErrorInverse}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('money.passkey_details.confirm_delete')}
                </Text>
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={closeSheet}
                testID={MoneyDeletePasskeySheetTestIds.CANCEL_BUTTON}
                twClassName="bg-muted"
              >
                {strings('money.passkey_details.cancel')}
              </Button>
            </Box>
          )}
        </>
      </Box>
    </BottomSheet>
  );
};

export default MoneyDeletePasskeySheet;

import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  centeredText: {
    textAlign: 'center',
  },
  description: {
    alignSelf: 'stretch',
  },
});

const MoneyRemoveEmailSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { passkeyCount } = useMoneyFinishSetup();
  const { isAuthenticatorAdded, isSmsAdded } = useMoneySecurityMethods();
  const canRemove = passkeyCount > 0 || isAuthenticatorAdded || isSmsAdded;

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleRemove = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
        params: {
          action: { type: 'remove-email' },
        },
      });
    });
  }, [navigation]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      keyboardAvoidingViewEnabled={false}
      testID="money-remove-email-sheet"
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
          />
        </Box>

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
              canRemove
                ? 'money.email_details.remove_title'
                : 'money.email_details.cannot_remove_title',
            )}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Regular}
            style={styles.description}
          >
            {strings(
              canRemove
                ? 'money.email_details.remove_description'
                : 'money.email_details.cannot_remove_description',
            )}
          </Text>
        </Box>

        {canRemove ? (
          <Box gap={3} twClassName="mt-6">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleRemove}
              testID="money-remove-email-confirm-button"
              twClassName="bg-error-default"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.ErrorInverse}
                fontWeight={FontWeight.Medium}
              >
                {strings('money.email_details.confirm_remove')}
              </Text>
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={closeSheet}
              testID="money-remove-email-cancel-button"
              twClassName="bg-muted"
            >
              {strings('money.passkey_details.cancel')}
            </Button>
          </Box>
        ) : (
          <Box twClassName="mt-6">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={closeSheet}
              testID="money-remove-email-got-it-button"
            >
              {strings('money.passkey_details.got_it')}
            </Button>
          </Box>
        )}
      </Box>
    </BottomSheet>
  );
};

export default MoneyRemoveEmailSheet;

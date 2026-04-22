import React, { useCallback, useRef } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  BottomSheet,
  type BottomSheetRef,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import Logger from '../../../../../../util/Logger';
import styleSheet from './ErrorDetailsModal.styles';

export interface ErrorDetailsModalParams {
  errorMessage: string;
  providerName?: string;
  providerSupportUrl?: string;
  showChangeProvider?: boolean;
  amount?: number;
}

export const createErrorDetailsModalNavDetails =
  createNavigationDetails<ErrorDetailsModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.ERROR_DETAILS,
  );

function ErrorDetailsModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const {
    errorMessage,
    providerName,
    providerSupportUrl,
    showChangeProvider,
    amount,
  } = useParams<ErrorDetailsModalParams>();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleContactSupport = useCallback(async () => {
    if (!providerSupportUrl) return;
    try {
      if (await InAppBrowser.isAvailable()) {
        handleClose();
        await InAppBrowser.open(providerSupportUrl);
      } else {
        handleClose();
        navigation.navigate('Webview', {
          screen: 'SimpleWebview',
          params: {
            url: providerSupportUrl,
            title: providerName,
          },
        });
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'ErrorDetailsModal: Failed to open support URL',
      );
    }
  }, [providerSupportUrl, providerName, handleClose, navigation]);

  const handleChangeProvider = useCallback(() => {
    navigation.replace(Routes.RAMP.MODALS.PROVIDER_SELECTION, { amount });
  }, [navigation, amount]);

  return (
    <BottomSheet ref={sheetRef} goBack={navigation.goBack}>
      <HeaderCompactStandard
        onClose={handleClose}
        closeButtonProps={{ testID: 'error-details-close-button' }}
      >
        <View style={styles.headerContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Md}
            color={IconColor.ErrorDefault}
          />
          <Text variant={TextVariant.HeadingMd}>
            {strings('deposit.errors.error_details_title')}
          </Text>
        </View>
      </HeaderCompactStandard>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={styles.errorText}
          >
            {errorMessage}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {showChangeProvider ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Lg}
            onPress={handleChangeProvider}
            style={styles.button}
            isFullWidth
          >
            {strings('fiat_on_ramp.change_provider_button')}
          </Button>
        ) : null}
        {!showChangeProvider && providerName && providerSupportUrl ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Lg}
            onPress={handleContactSupport}
            style={styles.button}
            isFullWidth
          >
            {strings('fiat_on_ramp.contact_provider_support', {
              provider: providerName,
            })}
          </Button>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonBaseSize.Lg}
          onPress={handleClose}
          style={styles.button}
          isFullWidth
        >
          {strings('fiat_on_ramp.got_it')}
        </Button>
      </View>
    </BottomSheet>
  );
}

export default ErrorDetailsModal;

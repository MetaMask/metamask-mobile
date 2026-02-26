import React, { useCallback, useRef } from 'react';
import { Linking, View, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
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

  const handleContactSupport = useCallback(() => {
    if (providerSupportUrl) {
      Linking.openURL(providerSupportUrl);
    }
  }, [providerSupportUrl]);

  const handleChangeProvider = useCallback(() => {
    navigation.replace(Routes.RAMP.MODALS.PROVIDER_SELECTION, { amount });
  }, [navigation, amount]);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'error-details-close-button' }}
      >
        <View style={styles.headerContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Md}
            color={IconColor.Error}
          />
          <Text variant={TextVariant.HeadingMD}>
            {strings('deposit.errors.error_details_title')}
          </Text>
        </View>
      </BottomSheetHeader>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.errorText}
          >
            {errorMessage}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {showChangeProvider ? (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            onPress={handleChangeProvider}
            label={strings('fiat_on_ramp.change_provider_button')}
            style={styles.button}
          />
        ) : null}
        {!showChangeProvider && providerName && providerSupportUrl ? (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            onPress={handleContactSupport}
            label={strings('fiat_on_ramp.contact_provider_support', {
              provider: providerName,
            })}
            style={styles.button}
          />
        ) : null}
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={handleClose}
          label={strings('fiat_on_ramp.got_it')}
          style={styles.button}
        />
      </View>
    </BottomSheet>
  );
}

export default ErrorDetailsModal;

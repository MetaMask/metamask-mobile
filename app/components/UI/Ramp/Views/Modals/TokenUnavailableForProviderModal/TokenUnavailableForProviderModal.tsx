import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import styleSheet from './TokenUnavailableForProviderModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRampsController } from '../../../hooks/useRampsController';
import { createProviderPickerModalNavigationDetails } from '../ProviderPickerModal';

export interface TokenUnavailableForProviderModalParams {
  assetId: string;
}

export const createTokenUnavailableForProviderModalNavigationDetails =
  createNavigationDetails<TokenUnavailableForProviderModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.TOKEN_UNAVAILABLE_FOR_PROVIDER,
  );

function TokenUnavailableForProviderModal() {
  const { assetId } = useParams<TokenUnavailableForProviderModalParams>();
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const { selectedProvider, selectedToken } = useRampsController();

  const tokenName = selectedToken?.name ?? '';
  const providerName = selectedProvider?.name ?? '';

  const handleChangeToken = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.RAMP.TOKEN_SELECTION, {
        screen: Routes.RAMP.TOKEN_SELECTION,
      });
    });
  }, [navigation]);

  const handleChangeProvider = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(
        ...createProviderPickerModalNavigationDetails({ assetId }),
      );
    });
  }, [navigation, assetId]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isInteractable={false}
      testID="token-unavailable-for-provider-modal"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'bottomsheetheader-close-button' }}
      >
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp.token_unavailable_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('fiat_on_ramp.token_unavailable_modal.description', {
            token: tokenName,
            provider: providerName,
          })}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button
            size={ButtonSize.Lg}
            onPress={handleChangeToken}
            label={strings('fiat_on_ramp.token_unavailable_modal.change_token')}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            testID="token-unavailable-change-token-button"
          />
        </View>
        <View style={styles.footerButton}>
          <Button
            size={ButtonSize.Lg}
            onPress={handleChangeProvider}
            label={strings(
              'fiat_on_ramp.token_unavailable_modal.change_provider',
            )}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            testID="token-unavailable-change-provider-button"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

export default TokenUnavailableForProviderModal;

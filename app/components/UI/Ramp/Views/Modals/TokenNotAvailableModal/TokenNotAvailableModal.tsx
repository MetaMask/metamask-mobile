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
import styleSheet from './TokenNotAvailableModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRampsController } from '../../../hooks/useRampsController';
import { createProviderSelectionModalNavigationDetails } from '../ProviderSelectionModal';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

export interface TokenNotAvailableModalParams {
  assetId: string;
}

export const createTokenNotAvailableModalNavigationDetails =
  createNavigationDetails<TokenNotAvailableModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE,
  );

function TokenNotAvailableModal() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { assetId } = useParams<TokenNotAvailableModalParams>();
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const { selectedProvider, selectedToken } = useRampsController();

  const tokenName = selectedToken?.name ?? '';
  const providerName = selectedProvider?.name ?? '';

  const handleChangeToken = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.RAMP.TOKEN_SELECTION);
    });
  }, [navigation]);

  const handleChangeProvider = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHANGE_PROVIDER_BUTTON_CLICKED)
        .addProperties({
          current_provider: selectedProvider?.name,
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(
        ...createProviderSelectionModalNavigationDetails({
          assetId,
          skipQuotes: true,
        }),
      );
    });
  }, [
    navigation,
    assetId,
    selectedProvider?.name,
    trackEvent,
    createEventBuilder,
  ]);

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

export default TokenNotAvailableModal;

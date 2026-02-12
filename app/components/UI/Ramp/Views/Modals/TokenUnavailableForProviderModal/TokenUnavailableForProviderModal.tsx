import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
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
import styleSheet from './TokenUnavailableForProviderModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';

interface TokenUnavailableForProviderModalProps {
  tokenName: string;
  providerName: string;
  onChangeToken: () => void;
  onChangeProvider: () => void;
}

function TokenUnavailableForProviderModal({
  tokenName,
  providerName,
  onChangeToken,
  onChangeProvider,
}: TokenUnavailableForProviderModalProps) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
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
            onPress={onChangeToken}
            label={strings('fiat_on_ramp.token_unavailable_modal.change_token')}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            testID="token-unavailable-change-token-button"
          />
        </View>
        <View style={styles.footerButton}>
          <Button
            size={ButtonSize.Lg}
            onPress={onChangeProvider}
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

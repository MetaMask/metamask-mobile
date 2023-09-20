import React, { useRef } from 'react';

import { SheetBottomRef } from '../../../component-library/components/Sheet/SheetBottom';
import SheetBottom from '../../../component-library/components/Sheet/SheetBottom/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader/SheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { View } from 'react-native';
import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import createStyles from './ShowNFTSheet.styles';

const ShowNftSheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<SheetBottomRef>(null);

  const handleSheetDismiss = () => null;

  const onConfirm = () => {
    const { PreferencesController } = Engine.context;
    sheetRef.current?.hide(() =>
      PreferencesController.setIsIpfsGatewayEnabled(true),
    );
  };

  const onCancel = () => {
    sheetRef.current?.hide();
  };

  return (
    <SheetBottom onDismissed={handleSheetDismiss} ref={sheetRef}>
      <SheetHeader title={strings('show_nft.show_nft_title')} />
      <Text style={styles.textContent}>
        {strings('show_nft.show_nft_content_1')}{' '}
        {
          <Text variant={TextVariant.BodyMDBold}>
            {strings('show_nft.show_nft_content_2')}
          </Text>
        }{' '}
        {strings('show_nft.show_nft_content_3')}{' '}
        {
          <Text variant={TextVariant.BodyMDBold}>
            {strings('show_nft.show_nft_content_4')}
          </Text>
        }{' '}
        {strings('show_nft.show_nft_content_5')}
      </Text>
      <View style={styles.actionsContainer}>
        <Button
          label={strings('action_view.cancel')}
          onPress={onCancel}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          style={styles.cancelButton}
        />
        <Button
          label={strings('action_view.confirm')}
          onPress={onConfirm}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          style={styles.confirmButton}
        />
      </View>
    </SheetBottom>
  );
};

export default ShowNftSheet;

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
import createStyles from './ShowDisplayNFTMediaSheet.styles';

const ShowDisplayNftMediaSheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<SheetBottomRef>(null);

  const handleSheetDismiss = () => null;

  const onConfirm = () => {
    const { PreferencesController } = Engine.context;
    sheetRef.current?.hide(() =>
      PreferencesController.setDisplayNftMedia(true),
    );
  };

  const onCancel = () => {
    sheetRef.current?.hide();
  };

  return (
    <SheetBottom onDismissed={handleSheetDismiss} ref={sheetRef}>
      <SheetHeader
        title={strings('show_display_nft_media.show_display_nft_media_title')}
      />
      <Text style={styles.textContent}>
        {strings('show_display_nft_media.show_display_nft_media_content_1')}{' '}
        {
          <Text variant={TextVariant.BodyMDBold}>
            {strings('show_display_nft_media.show_display_nft_media_content_2')}
          </Text>
        }{' '}
        {strings('show_display_nft_media.show_display_nft_media_content_3')}
        {'\n'}
        {'\n'}
        <Text>
          {strings('show_display_nft_media.show_display_nft_media_content_4')}{' '}
          <Text variant={TextVariant.BodyMDBold}>
            {strings('show_display_nft_media.show_display_nft_media_content_5')}
          </Text>
        </Text>
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

export default ShowDisplayNftMediaSheet;

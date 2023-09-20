import React, { useRef } from 'react';

import { SheetBottomRef } from '../../../component-library/components/Sheet/SheetBottom';
import SheetBottom from '../../../component-library/components/Sheet/SheetBottom/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader/SheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import createStyles from './ShowDisplayNFTMediaSheet.styles';
import SheetActionView from '../../../components/UI/SheetActionView';

const ShowDisplayNftMediaSheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<SheetBottomRef>(null);

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
    <SheetBottom ref={sheetRef}>
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
      <SheetActionView onCancel={onCancel} onConfirm={onConfirm} />
    </SheetBottom>
  );
};

export default ShowDisplayNftMediaSheet;

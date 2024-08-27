// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader/SheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import SheetActionView from '../../../components/UI/SheetActionView';

// Internal dependencies
import createStyles from './ShowDisplayNFTMediaSheet.styles';

const ShowDisplayNftMediaSheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  const onConfirm = () => {
    const { PreferencesController } = Engine.context;
    sheetRef.current?.onCloseBottomSheet(() =>
      PreferencesController.setDisplayNftMedia(true),
    );
  };

  const onCancel = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
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
    </BottomSheet>
  );
};

export default ShowDisplayNftMediaSheet;

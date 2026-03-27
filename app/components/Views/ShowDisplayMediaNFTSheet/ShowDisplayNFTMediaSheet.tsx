// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import createStyles from './ShowDisplayNFTMediaSheet.styles';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useMetrics } from '../../hooks/useMetrics';

const ShowDisplayNftMediaSheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { addTraitsToUser } = useMetrics();

  const onConfirm = () => {
    const { PreferencesController } = Engine.context;
    sheetRef.current?.onCloseBottomSheet(() => {
      PreferencesController.setDisplayNftMedia(true);
      const traits = {
        [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.ON,
      };
      addTraitsToUser(traits);
    });
  };

  const onCancel = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <HeaderCompactStandard
        title={strings('show_display_nft_media.show_display_nft_media_title')}
        onClose={onCancel}
      />
      <Text style={styles.textContent} color={TextColor.Alternative}>
        {strings('show_display_nft_media.show_display_nft_media_content_1')}{' '}
        {
          <Text variant={TextVariant.BodyMDBold} color={TextColor.Alternative}>
            {strings('show_display_nft_media.show_display_nft_media_content_2')}
          </Text>
        }{' '}
        {strings('show_display_nft_media.show_display_nft_media_content_3')}
        {'\n'}
        {'\n'}
        <Text color={TextColor.Alternative}>
          {strings('show_display_nft_media.show_display_nft_media_content_4')}{' '}
          <Text variant={TextVariant.BodyMDBold} color={TextColor.Alternative}>
            {strings('show_display_nft_media.show_display_nft_media_content_5')}
          </Text>
        </Text>
      </Text>
      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: onCancel,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
          },
          {
            onPress: onConfirm,
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default ShowDisplayNftMediaSheet;

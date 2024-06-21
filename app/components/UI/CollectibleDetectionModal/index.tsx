import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import { BannerVariant } from '../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import {
  hideNftFetchingLoadingIndicator,
  showNftFetchingLoadingIndicator,
} from '../../../reducers/collectibles';

const styles = StyleSheet.create({
  alertBar: {
    width: '95%',
    marginBottom: 15,
  },
});

const CollectibleDetectionModal = () => {
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const showToastAndEnableNFtDetection = () => {
    void (async () => {
      // show toast
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings('toast.nft_detection_enabled') }],
        iconName: IconName.CheckBold,
        iconColor: IconColor.Default,
        backgroundColor: colors.primary.inverse,
        hasNoTimeout: false,
      });
      // set nft autodetection
      const { PreferencesController, NftDetectionController } = Engine.context;
      PreferencesController.setDisplayNftMedia(true);
      PreferencesController.setUseNftDetection(true);
      // Call detect nfts
      showNftFetchingLoadingIndicator();
      try {
        await NftDetectionController.detectNfts();
      } finally {
        hideNftFetchingLoadingIndicator();
      }
    })();
  };
  return (
    <View style={styles.alertBar}>
      <Banner
        variant={BannerVariant.Alert}
        title={strings('wallet.nfts_autodetect_title')}
        description={strings('wallet.nfts_autodetection_desc')}
        actionButtonProps={{
          variant: ButtonVariants.Link,
          label: strings('wallet.nfts_autodetect_cta'),
          onPress: showToastAndEnableNFtDetection,
          textVariant: TextVariant.BodyMD,
        }}
      />
    </View>
  );
};

export default CollectibleDetectionModal;

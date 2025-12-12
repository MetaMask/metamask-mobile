import React, { useCallback, useContext } from 'react';
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
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useMetrics } from '../../hooks/useMetrics';
import { useNftDetection } from '../../hooks/useNftDetection';

const styles = StyleSheet.create({
  alertBar: {
    width: '95%',
    marginBottom: 15,
  },
});

const CollectibleDetectionModal = () => {
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { addTraitsToUser } = useMetrics();
  const { detectNfts } = useNftDetection();

  const showToastAndEnableNFtDetection = useCallback(() => {
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
    const { PreferencesController } = Engine.context;
    PreferencesController.setDisplayNftMedia(true);
    PreferencesController.setUseNftDetection(true);
    const traits = {
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.ON,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.ON,
    };
    addTraitsToUser(traits);
    detectNfts();
  }, [colors.primary.inverse, toastRef, addTraitsToUser, detectNfts]);

  return (
    <View style={styles.alertBar}>
      <Banner
        variant={BannerVariant.Alert}
        title={strings('wallet.nfts_autodetect_title')}
        description={strings('wallet.nfts_autodetection_desc')}
        actionButtonProps={{
          testID: 'collectible-detection-modal-button',
          variant: ButtonVariants.Link,
          label: strings('wallet.nfts_autodetect_cta'),
          onPress: showToastAndEnableNFtDetection,
          //@ts-expect-error this prop is being added by the name of labelTextVariant by this PR https://github.com/MetaMask/metamask-mobile/pull/10307
          textVariant: TextVariant.BodyMD,
        }}
      />
    </View>
  );
};

export default CollectibleDetectionModal;

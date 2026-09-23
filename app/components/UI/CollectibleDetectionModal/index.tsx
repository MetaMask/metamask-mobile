import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useNftDetection } from '../../hooks/useNftDetection';

const styles = StyleSheet.create({
  alertBar: {
    width: '95%',
    marginBottom: 15,
  },
});

const CollectibleDetectionModal = () => {
  const { identify } = useAnalytics();
  const { detectNfts } = useNftDetection();
  const navigation = useNavigation<AppNavigationProp>();
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const openBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  const showToastAndEnableNFtDetection = useCallback(() => {
    toast({
      title: strings('toast.nft_detection_enabled'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    });
    // set nft autodetection
    const { PreferencesController } = Engine.context;
    PreferencesController.setDisplayNftMedia(true);
    PreferencesController.setUseNftDetection(true);
    const traits = {
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.ON,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.ON,
    };
    identify(traits);
    detectNfts();
  }, [identify, detectNfts]);

  if (!isBasicFunctionalityEnabled) {
    return (
      <View style={styles.alertBar}>
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Error}
          title={strings('wallet.nfts_unavailable_title')}
          description={strings(
            'trending.basic_functionality_disabled_description',
          )}
          actionButtonProps={{
            testID: 'collectible-detection-modal-button',
            variant: ButtonVariants.Link,
            label: strings('trending.enable_basic_functionality'),
            onPress: openBasicFunctionality,
            //@ts-expect-error this prop is being added by the name of labelTextVariant by this PR https://github.com/MetaMask/metamask-mobile/pull/10307
            textVariant: TextVariant.BodyMD,
          }}
        />
      </View>
    );
  }

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

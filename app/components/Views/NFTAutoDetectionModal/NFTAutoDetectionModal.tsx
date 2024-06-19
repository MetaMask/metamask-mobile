/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
import React, { useRef, useCallback } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NFTAutoDetectionModal.styles';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import { View, Image } from 'react-native';
import { NftDetectionModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NftDetectionModal.selectors';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../core/Engine';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectChainId } from '../../../selectors/networkController';
import { useSelector } from 'react-redux';
import { selectDisplayNftMedia } from '../../../selectors/preferencesController';

const walletImage = require('../../../images/wallet-alpha.png');

const NFTAutoDetectionModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const chainId = useSelector(selectChainId);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const { trackEvent } = useMetrics();
  const enableNftDetectionAndDismissModal = useCallback(
    (value: boolean) => {
      if (value) {
        const { PreferencesController } = Engine.context;
        if (!displayNftMedia) {
          PreferencesController.setDisplayNftMedia(true);
        }
        PreferencesController.setUseNftDetection(true);
        trackEvent(MetaMetricsEvents.NFT_AUTO_DETECTION_MODAL_ENABLE, {
          chainId,
        });
      } else {
        trackEvent(MetaMetricsEvents.NFT_AUTO_DETECTION_MODAL_DISABLE, {
          chainId,
        });
      }

      if (sheetRef?.current) {
        sheetRef.current.onCloseBottomSheet();
      } else {
        navigation.goBack();
      }
    },
    [displayNftMedia, trackEvent, chainId, navigation],
  );

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader title={strings('enable_nft-auto-detection.title')} />
      <View testID={NftDetectionModalSelectorsIDs.CONTAINER}>
        <View style={styles.container}>
          <Image source={walletImage} style={styles.image} />
        </View>
        <View style={styles.description}>
          <Text>{strings('enable_nft-auto-detection.description')}</Text>

          <Text> • {strings('enable_nft-auto-detection.immediateAccess')}</Text>
          <Text> • {strings('enable_nft-auto-detection.navigate')}</Text>
          <Text> • {strings('enable_nft-auto-detection.dive')}</Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            testID={NftDetectionModalSelectorsIDs.ALLOW_BUTTON}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('enable_nft-auto-detection.allow')}
            onPress={() => enableNftDetectionAndDismissModal(true)}
          />
          <View style={styles.spacer} />

          <Button
            testID={NftDetectionModalSelectorsIDs.CANCEL_BUTTON}
            variant={ButtonVariants.Link}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('enable_nft-auto-detection.notRightNow')}
            onPress={() => enableNftDetectionAndDismissModal(false)}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default NFTAutoDetectionModal;

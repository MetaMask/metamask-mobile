/* eslint-disable no-console */

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

const NFTAutoDetectionModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const walletImage = require('../../../images/wallet-alpha.png'); // eslint-disable-line
  const navigation = useNavigation();
  const chainId = useSelector(selectChainId);
  const { trackEvent } = useMetrics();
  const enableNftDetectionAndDismissModal = useCallback(
    (value: boolean) => {
      if (value) {
        const { PreferencesController } = Engine.context;
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
    [chainId, trackEvent, navigation],
  );

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader title={strings('enable_nft-auto-detection.title')} />
      <View>
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
            testID="allow"
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('enable_nft-auto-detection.allow')}
            onPress={() => enableNftDetectionAndDismissModal(true)}
          />
          <View style={styles.spacer} />

          <Button
            testID="cancel"
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

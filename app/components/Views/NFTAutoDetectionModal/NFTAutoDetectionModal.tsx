/* eslint-disable no-console */

import React, { useRef } from 'react';
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

const NFTAutoDetectionModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const walletImage = require('../../../images/wallet-alpha.png'); // eslint-disable-line
  const navigation = useNavigation();
  const dismissModal = (): void => {
    if (sheetRef?.current) {
      sheetRef.current.onCloseBottomSheet();
    } else {
      navigation.goBack();
    }
  };

  const enableNftDetectionAndDismissModal = (): void => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseNftDetection(true);
    dismissModal();
  };

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
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('enable_nft-auto-detection.allow')}
            onPress={enableNftDetectionAndDismissModal}
          />
          <View style={styles.spacer} />

          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('enable_nft-auto-detection.notRightNow')}
            onPress={dismissModal}
            //onPress={() => sheetRef.current?.onCloseBottomSheet()}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default NFTAutoDetectionModal;

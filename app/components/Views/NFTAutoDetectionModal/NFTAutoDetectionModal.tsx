/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
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
import { NftDetectionModalSelectorsIDs } from './NftDetectionModal.testIds';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../core/Engine';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useSelector } from 'react-redux';
import { selectDisplayNftMedia } from '../../../selectors/preferencesController';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

const walletImage = require('../../../images/wallet-alpha.png');

const NFTAutoDetectionModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const { addTraitsToUser } = useMetrics();

  const enableNftDetectionAndDismissModal = (value: boolean) => {
    if (value) {
      const { PreferencesController } = Engine.context;
      if (!displayNftMedia) {
        PreferencesController.setDisplayNftMedia(true);
      }
      PreferencesController.setUseNftDetection(true);

      const traits = {
        [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.ON,
        ...(!displayNftMedia && {
          [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.ON,
        }),
      };
      addTraitsToUser(traits);
    }

    if (sheetRef?.current) {
      sheetRef.current.onCloseBottomSheet();
    } else {
      navigation.goBack();
    }
  };

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

import React, { useCallback, useRef } from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';

import styleSheet from './UnsupportedRegionModal.styles.ts';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { Region } from '../../types';
import { useRampSDK } from '../../sdk';
import { createRegionSelectorModalNavigationDetails } from '../RegionSelectorModal';

interface UnsupportedRegionModalParams {
  region: Region;
  regions: Region[];
}

export const createUnsupportedRegionModalNavigationDetails =
  createNavigationDetails(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.UNSUPPORTED_REGION,
  );

function UnsupportedRegionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { region, regions } = useParams<UnsupportedRegionModalParams>();
  const { isBuy } = useRampSDK();

  const { styles } = useStyles(styleSheet, {});

  const handleSelectDifferentRegion = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({ regions }),
      );
    });
  }, [navigation, regions]);

  const handleSupportLinkPress = useCallback(() => {
    const SUPPORT_URL =
      'https://support.metamask.io/metamask-portfolio/buy/my-country-region-isnt-supported-for-buying-crypto/';
    Linking.openURL(SUPPORT_URL);
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack isInteractable={false}>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp_aggregator.region.unsupported')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings('fiat_on_ramp_aggregator.region.unsupported_description', {
            rampType: strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.buy'
                : 'fiat_on_ramp_aggregator.sell',
            ),
          })}
        </Text>
        <View style={styles.regionContainer}>
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
            {region?.emoji}
          </Text>
          <Text
            variant={TextVariant.BodyLGMedium}
            color={TextColor.Default}
            style={styles.regionName}
          >
            {region?.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSupportLinkPress}>
          <Text variant={TextVariant.BodySM} style={styles.supportLink}>
            {strings('fiat_on_ramp_aggregator.region.unsupported_link')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={handleSelectDifferentRegion}
          label={strings('fiat_on_ramp_aggregator.region.select_region')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default UnsupportedRegionModal;

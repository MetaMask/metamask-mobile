import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import NavigationService from '../../../../../../../core/NavigationService';
import { DepositRegion } from '@consensys/native-ramps-sdk';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';

import styleSheet from './UnsupportedRegionModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

import { createRegionSelectorModalNavigationDetails } from '../RegionSelectorModal';
import { useDepositSDK } from '../../../sdk';
import { useRampNavigation } from '../../../../hooks/useRampNavigation';

export interface UnsupportedRegionModalParams {
  regions: DepositRegion[];
}
export const createUnsupportedRegionModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
  );

function UnsupportedRegionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { selectedRegion } = useDepositSDK();
  const { regions } = useParams<UnsupportedRegionModalParams>();
  const { goToAggregator } = useRampNavigation();

  const { styles } = useStyles(styleSheet, {});

  const handleNavigateToBuy = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      // @ts-expect-error navigation prop mismatch
      navigation.getParent()?.pop();
      goToAggregator();
    });
  }, [navigation, goToAggregator]);

  const handleSelectDifferentRegion = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({
          regions,
        }),
      );
    });
  }, [navigation, regions]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      // Use CommonActions to navigate from modal context
      NavigationService.navigation?.dispatch(
        CommonActions.navigate({
          name: Routes.ONBOARDING.HOME_NAV,
        }),
      );
    });
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack isInteractable={false}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.unsupported_region_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings('deposit.unsupported_region_modal.location_prefix')}
        </Text>
        <View style={styles.countryContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {selectedRegion?.flag}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.countryName}
          >
            {selectedRegion?.name}
          </Text>
        </View>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('deposit.unsupported_region_modal.description')}{' '}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={handleSelectDifferentRegion}
          label={strings('deposit.unsupported_region_modal.change_region')}
          variant={ButtonVariants.Link}
          width={ButtonWidthTypes.Full}
        />
        <Button
          size={ButtonSize.Lg}
          onPress={handleNavigateToBuy}
          label={strings('deposit.unsupported_region_modal.buy_crypto')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default UnsupportedRegionModal;

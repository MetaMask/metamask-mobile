import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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

import styleSheet from './UnsupportedStateModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

import { createStateSelectorModalNavigationDetails } from '../StateSelectorModal';
import { useDepositSDK } from '../../../sdk';
import { createBuyNavigationDetails } from '../../../../Aggregator/routes/utils';

export interface UnsupportedStateModalParams {
  stateCode?: string;
  stateName?: string;
  onStateSelect: (stateCode: string) => void;
}

export const createUnsupportedStateModalNavigationDetails =
  createNavigationDetails<UnsupportedStateModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
  );

function UnsupportedStateModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { selectedRegion } = useDepositSDK();
  const { stateCode, stateName, onStateSelect } =
    useParams<UnsupportedStateModalParams>();

  const { styles } = useStyles(styleSheet, {});

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const handleSelectDifferentState = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigation.navigate(
        ...createStateSelectorModalNavigationDetails({
          selectedState: stateCode,
          onStateSelect,
        }),
      );
    });
  }, [closeBottomSheetAndNavigate, navigation, stateCode, onStateSelect]);

  const handleTryAnotherOption = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigation.goBack();
      navigation.navigate(...createBuyNavigationDetails());
    });
  }, [closeBottomSheetAndNavigate, navigation]);

  const handleClose = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    });
  }, [closeBottomSheetAndNavigate, navigation]);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack isInteractable={false}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.unsupported_state_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings('deposit.unsupported_state_modal.location_prefix')}
        </Text>
        <View style={styles.stateContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {selectedRegion?.flag}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {stateName || selectedRegion?.name}
          </Text>
        </View>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('deposit.unsupported_state_modal.description')}{' '}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={handleSelectDifferentState}
          label={strings('deposit.unsupported_state_modal.change_state')}
          variant={ButtonVariants.Link}
          width={ButtonWidthTypes.Full}
        />
        <Button
          size={ButtonSize.Lg}
          onPress={handleTryAnotherOption}
          label={strings('deposit.unsupported_state_modal.try_another_option')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default UnsupportedStateModal;

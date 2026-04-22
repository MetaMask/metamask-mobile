import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  BottomSheet,
  BottomSheetRef,
  BottomSheetHeader,
} from '@metamask/design-system-react-native';

import styleSheet from './UnsupportedStateModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';

import { createStateSelectorModalNavigationDetails } from '../StateSelectorModal';
import { useRampsUserRegion } from '../../../hooks/useRampsUserRegion';

export interface UnsupportedStateModalParams {
  stateCode?: string;
  stateName?: string;
  onStateSelect: (stateCode: string) => void;
}

export const createUnsupportedStateModalNavigationDetails =
  createNavigationDetails<UnsupportedStateModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.UNSUPPORTED_STATE,
  );

function UnsupportedStateModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { userRegion } = useRampsUserRegion();
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
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      isInteractable={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('deposit.unsupported_state_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {strings('deposit.unsupported_state_modal.location_prefix')}
        </Text>
        <View style={styles.stateContainer}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {userRegion?.country?.flag}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {stateName || userRegion?.country?.name}
          </Text>
        </View>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('deposit.unsupported_state_modal.description')}{' '}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonWrapper}>
          <Button
            size={ButtonBaseSize.Lg}
            onPress={handleSelectDifferentState}
            variant={ButtonVariant.Tertiary}
            isFullWidth
          >
            {strings('deposit.unsupported_state_modal.change_state')}
          </Button>
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            size={ButtonBaseSize.Lg}
            onPress={handleClose}
            variant={ButtonVariant.Primary}
            isFullWidth
          >
            {strings('deposit.unsupported_state_modal.try_another_option')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default UnsupportedStateModal;

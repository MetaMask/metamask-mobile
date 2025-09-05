import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { NavigatableRootParamList } from '../../../../../../../util/navigation/types';

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
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../../../util/navigation/types';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

import { useDepositSDK } from '../../../sdk';
import { createBuyNavigationDetails } from '../../../../Aggregator/routes/utils';

type UnsupportedStateModalProps = StackScreenProps<
  RootParamList,
  'DepositUnsupportedStateModal'
>;

function UnsupportedStateModal({ route }: UnsupportedStateModalProps) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation =
    useNavigation<
      StackNavigationProp<
        NavigatableRootParamList,
        'DepositUnsupportedStateModal'
      >
    >();
  const { selectedRegion } = useDepositSDK();
  const { stateCode, stateName, onStateSelect } = route.params;

  const { styles } = useStyles(styleSheet, {});

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const handleSelectDifferentState = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigation.navigate('DepositModals', {
        screen: 'DepositStateSelectorModal',
        params: {
          selectedState: stateCode,
          onStateSelect,
        },
      });
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
      navigation.navigate('WalletTabHome', {
        screen: 'WalletTabStackFlow',
        params: {
          screen: 'WalletView',
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

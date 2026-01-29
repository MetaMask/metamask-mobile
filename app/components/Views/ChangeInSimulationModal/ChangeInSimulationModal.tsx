import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Button from '../../../component-library/components/Buttons/Button/Button';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import type { RootParamList } from '../../../util/navigation/types';

export const PROCEED_BUTTON_TEST_ID = 'proceed-button';
export const REJECT_BUTTON_TEST_ID = 'reject-button';

const createStyles = () =>
  StyleSheet.create({
    buttonsWrapper: {
      alignSelf: 'stretch',
      flexDirection: 'column',
      gap: 16,
      paddingTop: 24,
    },
    wrapper: {
      alignItems: 'center',
      padding: 16,
    },
    description: {
      textAlign: 'center',
    },
  });

type ChangeInSimulationModalRouteProp = RouteProp<
  RootParamList,
  'ChangeInSimulationModal'
>;

const ChangeInSimulationModal = () => {
  const route = useRoute<ChangeInSimulationModalRouteProp>();
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { onProceed, onReject } = route.params;

  const handleProceed = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onProceed();
  }, [onProceed, sheetRef]);

  const handleReject = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onReject();
  }, [onReject, sheetRef]);

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.wrapper}>
        <Icon
          color={IconColor.Error}
          name={IconName.Warning}
          size={IconSize.Xl}
        />
        <SheetHeader title={strings('change_in_simulation_modal.title')} />
        <Text>{strings('change_in_simulation_modal.description')}</Text>
        <View style={styles.buttonsWrapper}>
          <Button
            label={strings('change_in_simulation_modal.reject')}
            onPress={handleReject}
            size={ButtonSize.Lg}
            testID={REJECT_BUTTON_TEST_ID}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
          <Button
            label={strings('change_in_simulation_modal.proceed')}
            onPress={handleProceed}
            size={ButtonSize.Lg}
            testID={PROCEED_BUTTON_TEST_ID}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default ChangeInSimulationModal;

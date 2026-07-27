import React, { useCallback, useRef } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import {
  Text,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

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

interface ChangeInSimulationModalRouteParams {
  onProceed: () => void;
  onReject: () => void;
}

const ChangeInSimulationModal = () => {
  const route =
    useRoute<
      RouteProp<{ params: ChangeInSimulationModalRouteParams }, 'params'>
    >();
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
            onPress={handleReject}
            size={ButtonSize.Lg}
            testID={REJECT_BUTTON_TEST_ID}
            variant={ButtonVariant.Primary}
            isFullWidth
          >
            {strings('change_in_simulation_modal.reject')}
          </Button>
          <Button
            onPress={handleProceed}
            size={ButtonSize.Lg}
            testID={PROCEED_BUTTON_TEST_ID}
            variant={ButtonVariant.Secondary}
            isFullWidth
          >
            {strings('change_in_simulation_modal.proceed')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ChangeInSimulationModal;

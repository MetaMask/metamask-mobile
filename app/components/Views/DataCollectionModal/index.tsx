import React, { useRef } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import createStyles from './styles';
import { DataCollectionBottomSheetSelectorsIDs } from './DataCollectionBottomSheet.testIds';

const DataCollectionModal = () => {
  const styles = createStyles();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const acceptButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('data_collection_modal.accept'),
    size: ButtonSize.Lg,
    onPress: () => {
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    testID: DataCollectionBottomSheetSelectorsIDs.ACCEPT_BUTTON,
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View style={styles.wrapper}>
        <Icon
          size={IconSize.Lg}
          name={IconName.Warning}
          color={IconColor.Warning}
          testID={DataCollectionBottomSheetSelectorsIDs.ICON_WARNING}
        />
        <View style={styles.content}>
          <Text variant={TextVariant.BodyMD}>
            {strings('data_collection_modal.content')}
          </Text>
        </View>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={[acceptButtonProps]}
        />
      </View>
    </BottomSheet>
  );
};

export default DataCollectionModal;

import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../locales/i18n';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
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
import createStyles from './styles';

const DataCollectionModal = () => {
  const styles = createStyles();

  const acceptButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('data_collection_modal.accept'),
    size: ButtonSize.Lg,
    onPress: () => {},
  };

  return (
    <BottomSheet>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        Warning
      </Text>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD}>
          {strings('data_collection_modal.content')}
        </Text>
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[acceptButtonProps]}
      />
    </BottomSheet>
  );
};

export default DataCollectionModal;

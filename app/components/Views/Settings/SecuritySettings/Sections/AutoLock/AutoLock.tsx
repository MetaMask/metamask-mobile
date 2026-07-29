import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import AUTO_LOCK_OPTIONS, { AUTO_LOCK_SECTION } from './constants';
import { useStyles } from '../../../../../../component-library/hooks';
import PickerBase from '../../../../../../component-library/components/Pickers/PickerBase';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './styles';

const AutoLock = ({ onOpenSheet }: { onOpenSheet: () => void }) => {
  const { styles } = useStyles(styleSheet, {});
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lockTime = useSelector((state: any) => state.settings.lockTime);

  const selectedOption = AUTO_LOCK_OPTIONS.find(
    (option) => option.value === lockTime.toString(),
  );

  return (
    <View style={styles.setting} testID={AUTO_LOCK_SECTION}>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('app_settings.auto_lock')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.auto_lock_desc')}
      </Text>
      <View style={styles.picker}>
        <PickerBase onPress={onOpenSheet} style={styles.pickerTrigger}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            style={styles.selectedLabel}
            numberOfLines={1}
          >
            {selectedOption?.label}
          </Text>
        </PickerBase>
      </View>
    </View>
  );
};

export default AutoLock;

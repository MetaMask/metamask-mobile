import React from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AUTO_LOCK_OPTIONS from './constants';
import { setLockTime } from '../../../../../../actions/settings';
import { useStyles } from '../../../../../../component-library/hooks';
import SelectComponent from '../../../../../UI/SelectComponent';
import Text from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './styles';

const AutoLock = () => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  const lockTime = useSelector((state: any) => state.settings.lockTime);

  const selectLockTime = (time: string): void => {
    dispatch(setLockTime(parseInt(time, 10)));
  };

  return (
    <View style={styles.setting} testID={'auto-lock-section'}>
      <Text style={styles.title}>{strings('app_settings.auto_lock')}</Text>
      <Text style={styles.desc}>{strings('app_settings.auto_lock_desc')}</Text>
      <View style={styles.picker}>
        <SelectComponent
          selectedValue={lockTime.toString()}
          onValueChange={selectLockTime}
          label={strings('app_settings.auto_lock')}
          options={AUTO_LOCK_OPTIONS}
        />
      </View>
    </View>
  );
};

export default AutoLock;

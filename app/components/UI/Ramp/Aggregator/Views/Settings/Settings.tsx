import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useRampSDK, withRampSDK } from '../../sdk';
import useRampsUnifiedV2Enabled from '../../../hooks/useRampsUnifiedV2Enabled';

import SettingsOriginal from './SettingsOriginal';
import SettingsV2 from './SettingsV2';

import styles from './Settings.styles';

function Settings() {
  const { isInternalBuild } = useRampSDK();
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();
  const style = styles();

  return (
    <KeyboardAvoidingView
      style={style.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {isRampsUnifiedV2Enabled ? (
        <SettingsV2 isInternalBuild={isInternalBuild} />
      ) : (
        <SettingsOriginal isInternalBuild={isInternalBuild} />
      )}
    </KeyboardAvoidingView>
  );
}

export default withRampSDK(Settings);

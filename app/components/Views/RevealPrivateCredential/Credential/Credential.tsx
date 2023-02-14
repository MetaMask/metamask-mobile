import React, { useState } from 'react';
import { View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { createStyles } from './styles';

interface ICredentialBlurProps {
  credential: React.ReactNode;
  blur: boolean;
}

export type Address = `0x${string}` | Buffer;

const CredentialBlur = ({ credential, blur }: ICredentialBlurProps) => {
  const styles = createStyles();

  return (
    <View>
      {credential}
      {blur ? (
        <BlurView
          style={styles.blurView}
          blurType="xlight" // Values = dark, light, xlight .
          blurAmount={50}
          reducedTransparencyFallbackColor="white"
        />
      ) : null}
    </View>
  );
};

export default CredentialBlur;

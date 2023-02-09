import React, { useState } from 'react';
import { View } from 'react-native';
import { BlurView, Text } from '@react-native-community/blur';

const Credential = () => {
  const [blur, setBlur] = useState<boolean>(true);

  return (
    <View>
      {blur ? (
        <BlurView
          style={styles.blurView}
          blurType="light" // Values = dark, light, xlight .
          blurAmount={10}
          reducedTransparencyFallbackColor="white"
        />
      ) : null}
    </View>
  );
};

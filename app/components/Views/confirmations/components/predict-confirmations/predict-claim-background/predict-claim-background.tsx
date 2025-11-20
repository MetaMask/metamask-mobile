import { useWindowDimensions, Image } from 'react-native';
import React from 'react';
import ClaimBackground from '../../../../../../images/bg_claim.png';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-background.styles';

export function PredictClaimBackground() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, { screenWidth, screenHeight });

  return (
    <Image
      source={ClaimBackground}
      style={styles.image}
      testID="predict-claim-background"
    />
  );
}

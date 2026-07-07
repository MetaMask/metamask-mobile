import React, { useCallback, useState } from 'react';
import {
  Image,
  StyleSheet,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Rive, { Fit, Alignment, RNRiveError } from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectCardEducationAnimationEnabledFlag } from '../../../Money/selectors/featureFlags';
import CardEducationAnimationSource from '../../../../../animations/onboarding_card_education_v3.riv';
import { CardEducationAnimationTestIds } from './CardEducationAnimation.testIds';

const log = createProjectLogger('card-education-animation');

interface CardEducationAnimationProps {
  style?: StyleProp<ImageStyle>;
  fallbackSource: ImageSourcePropType;
  testID?: string;
}

const CardEducationAnimation = ({
  style,
  fallbackSource,
  testID,
}: CardEducationAnimationProps) => {
  const flagEnabled = useSelector(selectCardEducationAnimationEnabledFlag);
  const [hasError, setHasError] = useState(false);

  const animate = flagEnabled && !hasError;

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasError(true);
  }, []);

  if (!animate) {
    return (
      <Image
        source={fallbackSource}
        style={style}
        resizeMode="contain"
        testID={testID ?? CardEducationAnimationTestIds.STATIC_IMAGE}
      />
    );
  }

  const { width, height } = StyleSheet.flatten(style) ?? {};
  const riveStyle: ViewStyle = { width, height };

  return (
    <Rive
      source={CardEducationAnimationSource}
      artboardName="cards_container"
      autoplay
      fit={Fit.Contain}
      alignment={Alignment.Center}
      style={riveStyle}
      onError={handleError}
      testID={testID ?? CardEducationAnimationTestIds.RIVE}
    />
  );
};

export default CardEducationAnimation;

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './FoxLoader.styles';
import OnboardingAnimation from '../../Views/Onboarding/OnboardingAnimation';

const FoxLoader = () => {
  const { styles } = useStyles(styleSheet, {});
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show both animation and loader at the same time
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handler for fox animation completion (not used in splash screen)
  const handleFoxAnimationStart = () => {
    // No action needed in splash screen context
  };

  return (
    <View style={styles.container}>
      {showContent && (
        <>
          {/* Replicate exact same structure as onboarding screen */}
          <View style={styles.ctas}>
            <OnboardingAnimation
              startOnboardingAnimation
              setStartFoxAnimation={handleFoxAnimationStart}
            >
              {/* Empty children - we only want the animation */}
              <View />
            </OnboardingAnimation>
          </View>

          {/* Loader positioned absolutely at bottom */}
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="orange" />
          </View>
        </>
      )}
    </View>
  );
};

export default FoxLoader;

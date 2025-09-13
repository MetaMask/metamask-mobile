import React from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { SampleCounterPane } from './SampleCounterPane/SampleCounterPane';
import { SampleNetworkDisplay } from './SampleNetworkDisplay/SampleNetworkDisplay';
import { SamplePetNames } from './SamplePetNames/SamplePetNames';
import useSampleNetwork from '../hooks/useSampleNetwork/useSampleNetwork';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './SampleFeature.styles';
import { baseStyles } from '../../../../styles/common';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { selectSampleFeatureCounterEnabled } from '../../selectors/sampleFeatureCounter';

/**
 * SampleFeature Component
 *
 * A demonstration component that showcases various features of the MetaMask mobile app.
 * This component serves as a template and learning resource for developers.
 *
 * @component
 * @example
 * ```tsx
 * <SampleFeature />
 * ```
 *
 * @remarks
 * This is a sample feature and should not be used in production code.
 * It demonstrates:
 * - Network display functionality
 * - Counter implementation
 * - Pet names management
 * - Internationalization
 * - Styling patterns
 *
 * @sampleFeature do not use in production code
 *
 * @returns A scrollable view containing sample feature components
 */
const SampleFeature = () => {
  const { styles } = useStyles(styleSheet, {});
  const { networkName, networkImageSource } = useSampleNetwork();
  const isCounterEnabled = useSelector(selectSampleFeatureCounterEnabled);

  return (
    <KeyboardAwareScrollView
      style={[baseStyles.flexGrow, styles.wrapper]}
      resetScrollToCoords={{ x: 0, y: 0 }}
      keyboardShouldPersistTaps={'always'}
      testID="sample-feature-container"
    >
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {strings('sample_feature.title')}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('sample_feature.description')}
      </Text>
      <SampleNetworkDisplay
        name={networkName}
        imageSource={networkImageSource}
      />
      {isCounterEnabled && <SampleCounterPane />}
      <SamplePetNames />
    </KeyboardAwareScrollView>
  );
};

export default SampleFeature;

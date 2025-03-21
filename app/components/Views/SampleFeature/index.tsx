import React from 'react';
import { ScrollView } from 'react-native';

import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import createStyles from './SampleFeature.styles';
import Text, {TextColor, TextVariant} from '../../../component-library/components/Texts/Text';


/**
 * Main view for app Experimental Settings
 */
const SampleFeature = () => {

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.wrapper}>
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
    </ScrollView>
  );
};

export default SampleFeature;

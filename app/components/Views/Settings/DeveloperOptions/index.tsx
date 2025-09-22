import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useParams } from '../../../../util/navigation/navUtils';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import SentryTest from './SentryTest';
///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
import SampleFeatureDevSettingsEntryPoint from '../../../../features/SampleFeature/components/views/SampleFeatureDevSettingsEntryPoint/SampleFeatureDevSettingsEntryPoint';
///: END:ONLY_INCLUDE_IF
import { PerpsDeveloperOptionsSection } from '../../../UI/Perps/components/PerpsDeveloperOptionsSection/PerpsDeveloperOptionsSection';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';

const DeveloperOptions = () => {
  const navigation = useNavigation();
  const params = useParams<{ isFullScreenModal: boolean }>();
  const isFullScreenModal = params?.isFullScreenModal;

  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, { theme });

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  useEffect(
    () => {
      navigation.setOptions(
        getNavigationOptionsTitle(
          strings('app_settings.developer_options.title'),
          navigation,
          isFullScreenModal,
          colors,
          null,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  return (
    <ScrollView style={styles.wrapper}>
      <SentryTest />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      }
      <SampleFeatureDevSettingsEntryPoint />
      {
        ///: END:ONLY_INCLUDE_IF
      }
      {isPerpsEnabled && <PerpsDeveloperOptionsSection />}
    </ScrollView>
  );
};

export default DeveloperOptions;

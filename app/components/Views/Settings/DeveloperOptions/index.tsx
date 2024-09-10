import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { Props } from './DeveloperOptions.types';
import createStyles from './DeveloperOptions.styles';
import SentryTest from './SentryTest';

const DeveloperOptions = ({ navigation, route }: Props) => {
  const isFullScreenModal = route?.params?.isFullScreenModal;

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

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
    </ScrollView>
  );
};

export default DeveloperOptions;

// Third party dependencies
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';

// Internal dependencies
import NetworkDetailsCheckSettings from '../../Settings/NetworkDetailsCheckSettings';
import styleSheet from './index.styles';

const SecuritySettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const renderBackButton = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
      </TouchableOpacity>
    ),
    [navigation, styles.backButton],
  );
  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('default_settings.drawer_security_title')}
      </Text>
    ),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  return (
    <ScrollView style={styles.root}>
      <NetworkDetailsCheckSettings />
    </ScrollView>
  );
};

export default SecuritySettings;

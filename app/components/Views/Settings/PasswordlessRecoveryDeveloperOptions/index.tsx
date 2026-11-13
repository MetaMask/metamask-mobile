import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextColor } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { useSelector } from 'react-redux';
import styleSheet from '../DeveloperOptions/DeveloperOptions.styles';
import PasswordlessRecoveryDeveloperOptionsSection from '../DeveloperOptions/PasswordlessRecoveryDeveloperOptionsSection';

/**
 * Dev-build Settings screen for passwordless recovery setup. Shown without
 * `MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS` so recovery can be tested on a normal
 * MFA/dev build.
 */
const PasswordlessRecoveryDeveloperOptions = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings(
          'app_settings.developer_options.passwordless_recovery.title',
        )}
        titleProps={{ color: TextColor.PrimaryDefault }}
        onBack={handleBack}
        includesTopInset
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <PasswordlessRecoveryDeveloperOptionsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PasswordlessRecoveryDeveloperOptions;

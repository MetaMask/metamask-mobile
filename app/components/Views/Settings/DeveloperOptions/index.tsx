import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HeaderStandard,
  TextColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useParams } from '../../../../util/navigation/navUtils';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import SentryTest from './SentryTest';
import HapticsDeveloperOptionsSection from './HapticsDeveloperOptionsSection';
import IdentityDeveloperOptionsSection from './IdentityDeveloperOptionsSection';
import { PerpsDeveloperOptionsSection } from '../../../UI/Perps/components/PerpsDeveloperOptionsSection/PerpsDeveloperOptionsSection';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ConfirmationsDeveloperOptions } from '../../confirmations/components/developer/confirmations-developer-options';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../UI/Earn/selectors/featureFlags';
import { MusdDeveloperOptionsSection } from '../../../UI/Earn/components/MusdDeveloperOptionsSection';
import { CardDeveloperOptionsSection } from '../../../UI/Card/components/CardDeveloperOptionsSection';
import { selectMoneyEnableMoneyAccountFlag } from '../../../UI/Money/selectors/featureFlags';
import { MoneyUiDeveloperOptionsSection } from '../../../UI/Money/components/MoneyUiDeveloperOptionsSection';
import NotificationsDeveloperOptionsSection from '../../../UI/Notification/DeveloperOptionsSection/NotificationsDeveloperOptionsSection';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import SocialLeaderboardDeveloperOptionsSection from '../../SocialLeaderboard/components/SocialLeaderboardDeveloperOptionsSection/SocialLeaderboardDeveloperOptionsSection';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

/**
 * Only enabled in dev/test builds via `INCLUDE_SAMPLE_FEATURE=true`;
 * otherwise this is dead-code-eliminated out of production bundles.
 */
const SampleFeatureDevSettingsEntryPoint: React.FC =
  process.env.INCLUDE_SAMPLE_FEATURE === 'true'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require -- intentional dead-code-eliminated lazy load; keeps the sample feature out of prod bundles
      require('../../../../features/SampleFeature/components/views/SampleFeatureDevSettingsEntryPoint/SampleFeatureDevSettingsEntryPoint')
        .default
    : () => null;

const DeveloperOptions = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<{ isFullScreenModal: boolean }>();
  const isFullScreenModal = params?.isFullScreenModal;

  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isMusdConversionEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandard
        title={strings('app_settings.developer_options.title')}
        titleProps={{ color: TextColor.PrimaryDefault }}
        onBack={isFullScreenModal ? undefined : handleBack}
        onClose={isFullScreenModal ? handleClose : undefined}
        includesTopInset
        testID="developer-options-header"
        {...(isFullScreenModal
          ? {
              closeButtonProps: {
                testID: 'developer-options-close-button',
              },
            }
          : {
              backButtonProps: {
                testID: 'developer-options-back-button',
              },
            })}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <SentryTest />
        <SampleFeatureDevSettingsEntryPoint />
        {isPerpsEnabled && <PerpsDeveloperOptionsSection />}
        <ConfirmationsDeveloperOptions />
        {isMusdConversionEnabled && <MusdDeveloperOptionsSection />}
        {isMoneyAccountEnabled && <MoneyUiDeveloperOptionsSection />}
        <CardDeveloperOptionsSection />
        <IdentityDeveloperOptionsSection />
        <NotificationsDeveloperOptionsSection />
        {isSocialLeaderboardEnabled && (
          <SocialLeaderboardDeveloperOptionsSection />
        )}
        <HapticsDeveloperOptionsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DeveloperOptions;

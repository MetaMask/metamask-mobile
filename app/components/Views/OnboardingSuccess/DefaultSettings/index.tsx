import React from 'react';
import { ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  ListItem,
  ListItemVariant,
  Text,
  TextButton,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { useSelector } from 'react-redux';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { selectMobileUxBftcConsolidationFlagEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';

const DefaultSettings = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);
  const isBasicFunctionalityConsolidationEnabled = useSelector(
    selectMobileUxBftcConsolidationFlagEnabled,
  );

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_BEST_PRACTICES);
  };

  const chevron = (
    <Icon name={IconName.ArrowRight} color={IconColor.IconAlternative} />
  );

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        includesTopInset
        title={strings('default_settings.default_settings')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={tw.style('flex-1')}>
        <Box twClassName="px-4">
          <Text variant={TextVariant.BodyMd}>
            {strings('default_settings.description')}{' '}
            <TextButton onPress={handleLink}>
              {strings('default_settings.learn_more_about_privacy')}
            </TextButton>
          </Text>
        </Box>
        <ListItem
          isInteractive
          variant={ListItemVariant.MultiLine}
          title={strings('default_settings.drawer_general_title')}
          description={strings('default_settings.drawer_general_title_desc')}
          endAccessory={chevron}
          accessoryGap={4}
          onPress={() =>
            navigation.navigate(Routes.ONBOARDING.GENERAL_SETTINGS)
          }
        />
        <ListItem
          isInteractive
          variant={ListItemVariant.MultiLine}
          title={strings('default_settings.drawer_assets_title')}
          description={strings('default_settings.drawer_assets_desc')}
          endAccessory={chevron}
          accessoryGap={4}
          onPress={() => navigation.navigate(Routes.ONBOARDING.ASSETS_SETTINGS)}
        />
        {(!isBasicFunctionalityConsolidationEnabled || isSocialLogin) && (
          <ListItem
            isInteractive
            variant={ListItemVariant.MultiLine}
            title={strings('default_settings.drawer_security_title')}
            description={strings('default_settings.drawer_security_desc')}
            endAccessory={chevron}
            accessoryGap={4}
            onPress={() =>
              navigation.navigate(Routes.ONBOARDING.SECURITY_SETTINGS)
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DefaultSettings;

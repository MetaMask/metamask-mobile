import React, { useCallback } from 'react';
import {
  ActionListItem,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../../../util/theme';

import { useRampSDK, withRampSDK } from '../../sdk';
import useRampsController from '../../../hooks/useRampsController';
import ScreenLayout from '../../components/ScreenLayout';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';

import ActivationKeys from './ActivationKeys';

import styles from './Settings.styles';

export const RAMP_SETTINGS_HEADER_TEST_ID = 'ramp-settings-header';
export const RAMP_SETTINGS_BACK_BUTTON_TEST_ID = 'ramp-settings-back-button';
export const RAMP_SETTINGS_HEADLESS_PLAYGROUND_BUTTON_TEST_ID =
  'ramp-settings-headless-playground-button';

function Settings() {
  const navigation = useNavigation<AppNavigationProp>();
  const { isInternalBuild } = useRampSDK();
  const { colors } = useTheme();
  const { userRegion } = useRampsController();
  const style = styles(colors);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleChangeRegion = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.REGION_SELECTOR);
  }, [navigation]);

  const handleOpenHeadlessPlayground = useCallback(() => {
    navigation.navigate(Routes.RAMP.HEADLESS_PLAYGROUND);
  }, [navigation]);

  const regionLabel =
    userRegion?.state?.name ||
    userRegion?.country?.name ||
    strings('app_settings.fiat_on_ramp.no_region_selected');

  const regionFlag = userRegion?.country?.flag || '🏳️';

  const arrowRightIcon = (
    <Icon
      name={IconName.ArrowRight}
      size={IconSize.Sm}
      color={IconColor.IconAlternative}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={style.container}>
      <HeaderStandard
        testID={RAMP_SETTINGS_HEADER_TEST_ID}
        title={strings('app_settings.fiat_on_ramp.title')}
        onBack={handleBack}
        backButtonProps={{ testID: RAMP_SETTINGS_BACK_BUTTON_TEST_ID }}
      />
      <KeyboardAvoidingView
        style={style.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenLayout scrollable>
          <ScreenLayout.Body>
            <ScreenLayout.Content style={style.scrollContent}>
              <View style={style.inner}>
                <View style={style.setting}>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={style.settingTitle}
                  >
                    {strings('app_settings.fiat_on_ramp.current_region')}
                  </Text>

                  <ActionListItem
                    label={regionLabel}
                    startAccessory={
                      <Text variant={TextVariant.BodyMD} style={style.rowFlag}>
                        {regionFlag}
                      </Text>
                    }
                    endAccessory={arrowRightIcon}
                    onPress={handleChangeRegion}
                    accessibilityRole="button"
                    accessibilityLabel={strings(
                      'app_settings.fiat_on_ramp.change_region',
                    )}
                    style={style.actionRow}
                  />
                </View>
                {isInternalBuild ? (
                  <>
                    <View style={style.groupDivider} />
                    <ActivationKeys />
                    <View style={style.groupDivider} />
                    <ActionListItem
                      label={strings(
                        'app_settings.fiat_on_ramp.headless_playground.title',
                      )}
                      description={strings(
                        'app_settings.fiat_on_ramp.headless_playground.entry_description',
                      )}
                      endAccessory={arrowRightIcon}
                      onPress={handleOpenHeadlessPlayground}
                      accessibilityRole="button"
                      testID={RAMP_SETTINGS_HEADLESS_PLAYGROUND_BUTTON_TEST_ID}
                      style={style.actionRow}
                    />
                  </>
                ) : null}
              </View>
            </ScreenLayout.Content>
          </ScreenLayout.Body>
        </ScreenLayout>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default withRampSDK(Settings);

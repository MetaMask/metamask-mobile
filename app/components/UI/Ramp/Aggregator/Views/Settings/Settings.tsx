// Third party dependencies
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import { useRampSDK } from '../../sdk';
import ScreenLayout from '../../components/ScreenLayout';
import Row from '../../components/Row';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';

import { strings } from '../../../../../../../locales/i18n';
import { useAppTheme } from '../../../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../../Navbar';
import useAnalytics from '../../hooks/useAnalytics';

// Internal dependencies
import ActivationKeys from './ActivationKeys';

import styles from './Settings.styles';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn from '../../../../../../component-library/components/List/ListItemColumn';
import { useDepositSDK } from '../../../Deposit/sdk';
import withRampAndDepositSDK from '../../../utils/withRampAndDepositSDK';

const depositProviderName = 'Transak';

function Settings() {
  const navigation = useNavigation();
  const { selectedRegion, setSelectedRegion, isInternalBuild } = useRampSDK();
  const { clearAuthToken, isAuthenticated, checkExistingToken } =
    useDepositSDK();
  const { colors } = useAppTheme();
  const style = styles();
  const trackEvent = useAnalytics();

  const [displayLogoutMessage, setDisplayLogoutMessage] = useState(false);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.fiat_on_ramp.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation]);

  useEffect(() => {
    checkExistingToken();
  }, [checkExistingToken]);

  const handleResetRegion = useCallback(() => {
    trackEvent('RAMP_REGION_RESET', {
      location: 'Settings Screen',
    });
    setSelectedRegion(null);
  }, [setSelectedRegion, trackEvent]);

  const handleResetDepositAuth = useCallback(async () => {
    await clearAuthToken();
    setDisplayLogoutMessage(true);
  }, [clearAuthToken]);

  return (
    <KeyboardAvoidingView
      style={style.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenLayout scrollable>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <Row first>
              <Text variant={TextVariant.BodyLGMedium}>
                {strings('app_settings.fiat_on_ramp.current_region')}
              </Text>

              <ListItem>
                <ListItemColumn>
                  <Text>{selectedRegion ? selectedRegion.emoji : '🏳️'}</Text>
                </ListItemColumn>
                <ListItemColumn>
                  <Text>
                    {selectedRegion
                      ? selectedRegion.name
                      : strings('app_settings.fiat_on_ramp.no_region_selected')}
                  </Text>
                </ListItemColumn>
              </ListItem>
              {selectedRegion ? (
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  onPress={handleResetRegion}
                  label={strings('app_settings.fiat_on_ramp.reset_region')}
                />
              ) : null}
            </Row>
            {isInternalBuild ? (
              <Row>
                <ActivationKeys />
              </Row>
            ) : null}

            {isAuthenticated ? (
              <Row>
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  onPress={handleResetDepositAuth}
                  label={strings(
                    'app_settings.fiat_on_ramp.deposit_provider_logout_button',
                    {
                      depositProviderName,
                    },
                  )}
                />
              </Row>
            ) : null}
            {displayLogoutMessage ? (
              <Row>
                <Text>
                  {strings(
                    'app_settings.fiat_on_ramp.deposit_provider_logged_out',
                    {
                      depositProviderName,
                    },
                  )}
                </Text>
              </Row>
            ) : null}
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    </KeyboardAvoidingView>
  );
}

export default withRampAndDepositSDK(Settings);

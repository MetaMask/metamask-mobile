// Third party dependencies
import React, { useCallback, useEffect } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import { useRampSDK, withRampSDK } from '../../sdk';
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
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import useAnalytics from '../../../hooks/useAnalytics';

// Internal dependencies
import ActivationKeys from './ActivationKeys';

import styles from './Settings.styles';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn from '../../../../../../component-library/components/List/ListItemColumn';

function Settings() {
  const navigation = useNavigation();
  const { selectedRegion, setSelectedRegion, isInternalBuild } = useRampSDK();
  const style = styles();
  const trackEvent = useAnalytics();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleResetRegion = useCallback(() => {
    trackEvent('RAMP_REGION_RESET', {
      location: 'Settings Screen',
    });
    setSelectedRegion(null);
  }, [setSelectedRegion, trackEvent]);

  return (
    <>
      <HeaderCenter
        title={strings('app_settings.fiat_on_ramp.title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
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
          </ScreenLayout.Content>
        </ScreenLayout.Body>
          </ScreenLayout>
      </KeyboardAvoidingView>
    </>
  );
}

export default withRampSDK(Settings);

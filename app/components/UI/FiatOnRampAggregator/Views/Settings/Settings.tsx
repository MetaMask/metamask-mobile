import React, { useCallback, useEffect } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFiatOnRampSDK, withFiatOnRampSDK } from '../../sdk';

import BaseListItem from '../../../../Base/ListItem';
import Text from '../../../../Base/Text';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../components/ScreenLayout';
import Row from '../../components/Row';
import ActivationKeys from './ActivationKeys';

import { strings } from '../../../../../../locales/i18n';
import { useAppTheme } from '../../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../Navbar';
import styles from './Settings.styles';
import useAnalytics from '../../hooks/useAnalytics';

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

function Settings() {
  const navigation = useNavigation();
  const { selectedRegion, setSelectedRegion, isInternalBuild } =
    useFiatOnRampSDK();
  const { colors } = useAppTheme();
  const style = styles(colors);
  const trackEvent = useAnalytics();

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.fiat_on_ramp.title'),
        navigation,
        false,
        colors,
        false,
      ),
    );
  }, [colors, navigation]);

  const handleResetRegion = useCallback(() => {
    trackEvent('ONRAMP_REGION_RESET', {
      location: 'Settings Screen',
    });
    setSelectedRegion(null);
  }, [setSelectedRegion, trackEvent]);

  return (
    <KeyboardAvoidingView
      style={style.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenLayout scrollable>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <Row>
              <Text style={style.title}>
                {strings('app_settings.fiat_on_ramp.current_region')}
              </Text>
              {selectedRegion ? (
                <>
                  <ListItem>
                    <ListItem.Content>
                      <ListItem.Icon>
                        <Text bigger>{selectedRegion.emoji}</Text>
                      </ListItem.Icon>
                      <ListItem.Body>
                        <Text big>{selectedRegion.name}</Text>
                      </ListItem.Body>
                    </ListItem.Content>
                  </ListItem>
                  <StyledButton type="normal" onPress={handleResetRegion}>
                    {strings('app_settings.fiat_on_ramp.reset_region')}
                  </StyledButton>
                </>
              ) : (
                <ListItem>
                  <ListItem.Content>
                    <ListItem.Icon>
                      <Text bigger>🏳️</Text>
                    </ListItem.Icon>
                    <ListItem.Body>
                      <ListItem.Title>
                        <Text big>
                          {strings(
                            'app_settings.fiat_on_ramp.no_region_selected',
                          )}
                        </Text>
                      </ListItem.Title>
                    </ListItem.Body>
                  </ListItem.Content>
                </ListItem>
              )}
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
  );
}
export default withFiatOnRampSDK(Settings);

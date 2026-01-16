import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

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
import useAnalytics from '../../../hooks/useAnalytics';

import ActivationKeys from './ActivationKeys';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn from '../../../../../../component-library/components/List/ListItemColumn';

interface SettingsOriginalProps {
  isInternalBuild?: boolean;
}

function SettingsOriginal({ isInternalBuild }: SettingsOriginalProps) {
  const navigation = useNavigation();
  const { selectedRegion, setSelectedRegion } = useRampSDK();
  const { colors } = useAppTheme();
  const trackEvent = useAnalytics();

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

  const handleResetRegion = useCallback(() => {
    trackEvent('RAMP_REGION_RESET', {
      location: 'Settings Screen',
    });
    setSelectedRegion(null);
  }, [setSelectedRegion, trackEvent]);

  return (
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
  );
}

export default SettingsOriginal;

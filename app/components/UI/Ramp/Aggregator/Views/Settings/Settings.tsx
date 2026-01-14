// Third party dependencies
import React, { useCallback, useEffect, useMemo } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

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
import { useAppTheme } from '../../../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../../Navbar';
import useAnalytics from '../../../hooks/useAnalytics';
import useRampsUnifiedV2Enabled from '../../../hooks/useRampsUnifiedV2Enabled';
import { selectUserRegion } from '../../../../../../selectors/rampsController';
import useRampsRegions from '../../../../../Views/Settings/hooks/useRampsRegions';
import { createRegionSelectorModalNavigationDetails } from '../../../../../Views/Settings/RegionSelectorModal/RegionSelectorModal';

// Internal dependencies
import ActivationKeys from './ActivationKeys';

import styles from './Settings.styles';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn from '../../../../../../component-library/components/List/ListItemColumn';

function Settings() {
  const navigation = useNavigation();
  const { selectedRegion, setSelectedRegion, isInternalBuild } = useRampSDK();
  const { colors } = useAppTheme();
  const style = styles();
  const trackEvent = useAnalytics();
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();
  const userRegion = useSelector(selectUserRegion);
  const { regions } = useRampsRegions();

  const { regionDisplayName, regionFlag } = useMemo(() => {
    if (!userRegion || !regions) {
      return { regionDisplayName: null, regionFlag: '🏳️' };
    }

    const regionParts = userRegion.toLowerCase().split('-');
    const countryCode = regionParts[0];
    const stateCode = regionParts[1];

    const country = regions.find(
      (r) => r.isoCode.toLowerCase() === countryCode,
    );

    if (!country) {
      return { regionDisplayName: null, regionFlag: '🏳️' };
    }

    if (stateCode && country.states) {
      const state = country.states.find(
        (s) =>
          s.stateId?.toLowerCase() === stateCode ||
          s.id?.toLowerCase().endsWith(`-${stateCode}`),
      );
      if (state?.name) {
        return {
          regionDisplayName: `${country.name}, ${state.name}`,
          regionFlag: country.flag,
        };
      }
    }

    return {
      regionDisplayName: country.name,
      regionFlag: country.flag,
    };
  }, [userRegion, regions]);

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

  const handleChangeRegion = useCallback(() => {
    if (regions) {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({ regions }),
      );
    }
  }, [navigation, regions]);

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

              {isRampsUnifiedV2Enabled ? (
                <>
                  <ListItem>
                    <ListItemColumn>
                      <Text>{regionFlag}</Text>
                    </ListItemColumn>
                    <ListItemColumn>
                      <Text>
                        {regionDisplayName ||
                          strings(
                            'app_settings.fiat_on_ramp.no_region_selected',
                          )}
                      </Text>
                    </ListItemColumn>
                  </ListItem>
                  <Button
                    variant={ButtonVariants.Primary}
                    size={ButtonSize.Lg}
                    width={ButtonWidthTypes.Full}
                    onPress={handleChangeRegion}
                    label={strings('app_settings.fiat_on_ramp.change_region')}
                  />
                </>
              ) : (
                <>
                  <ListItem>
                    <ListItemColumn>
                      <Text>
                        {selectedRegion ? selectedRegion.emoji : '🏳️'}
                      </Text>
                    </ListItemColumn>
                    <ListItemColumn>
                      <Text>
                        {selectedRegion
                          ? selectedRegion.name
                          : strings(
                              'app_settings.fiat_on_ramp.no_region_selected',
                            )}
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
                </>
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

export default withRampSDK(Settings);

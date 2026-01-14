import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

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
import { selectUserRegion } from '../../../../../../selectors/rampsController';
import useRampsRegions from '../../../../../Views/Settings/hooks/useRampsRegions';
import { createRegionSelectorModalNavigationDetails } from '../../../../../Views/Settings/RegionSelectorModal/RegionSelectorModal';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn from '../../../../../../component-library/components/List/ListItemColumn';
import ActivationKeys from './ActivationKeys';

interface SettingsV2Props {
  isInternalBuild?: boolean;
}

function SettingsV2({ isInternalBuild }: SettingsV2Props) {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const userRegion = useSelector(selectUserRegion);
  const { regions } = useRampsRegions();

  console.log('userRegion', userRegion);
  console.log('regions', regions);

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

  const { regionDisplayName, regionFlag } = useMemo(() => {
    if (!userRegion || !regions) {
      return { regionDisplayName: null, regionFlag: '🏳️' };
    }

    const regionParts = userRegion.toLowerCase().split('-');
    const countryCode = regionParts[0];
    const stateCode = regionParts[1];

    const country = regions.find(
      (r) => r.isoCode?.toLowerCase() === countryCode,
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

  const handleChangeRegion = useCallback(() => {
    if (regions) {
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({ regions }),
      );
    }
  }, [navigation, regions]);

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
                <Text>{regionFlag}</Text>
              </ListItemColumn>
              <ListItemColumn>
                <Text>
                  {regionDisplayName ||
                    strings('app_settings.fiat_on_ramp.no_region_selected')}
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

export default SettingsV2;

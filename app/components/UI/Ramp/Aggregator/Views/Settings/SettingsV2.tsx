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
import Routes from '../../../../../../constants/navigation/Routes';

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

    const country = regions.find((r) => {
      if (r.isoCode?.toLowerCase() === countryCode) {
        return true;
      }
      if (r.id) {
        const id = r.id.toLowerCase();
        if (id.startsWith('/regions/')) {
          const extractedCode = id.replace('/regions/', '').split('/')[0];
          return extractedCode === countryCode;
        }
        return id === countryCode || id.endsWith(`/${countryCode}`);
      }
      return false;
    });

    if (!country) {
      return { regionDisplayName: null, regionFlag: '🏳️' };
    }

    const flag = country.flag || '🏳️';

    if (stateCode && country.states) {
      const state = country.states.find((s) => {
        if (s.stateId?.toLowerCase() === stateCode) {
          return true;
        }
        if (s.id) {
          const stateId = s.id.toLowerCase();
          if (
            stateId.includes(`-${stateCode}`) ||
            stateId.endsWith(`/${stateCode}`)
          ) {
            return true;
          }
        }
        return false;
      });
      if (state?.name) {
        return {
          regionDisplayName: state.name,
          regionFlag: flag,
        };
      }
    }

    return {
      regionDisplayName: country.name,
      regionFlag: flag,
    };
  }, [userRegion, regions]);

  const handleChangeRegion = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.REGION_SELECTOR);
  }, [navigation]);

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

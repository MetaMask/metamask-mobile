import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

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
import Routes from '../../../../../../constants/navigation/Routes';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn from '../../../../../../component-library/components/List/ListItemColumn';
import ActivationKeys from './ActivationKeys';
import useRampsController from '../../../hooks/useRampsController';

interface SettingsV2Props {
  isInternalBuild?: boolean;
}

function SettingsV2({ isInternalBuild }: SettingsV2Props) {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { userRegion } = useRampsController();

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
                <Text>{userRegion?.country.flag || '🏳️'}</Text>
              </ListItemColumn>
              <ListItemColumn>
                <Text>
                  {userRegion?.state?.name ||
                    userRegion?.country.name ||
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

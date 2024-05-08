import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import ViewCardPlaceholder from '../../../../images/viewCard.png';
import { createStyles } from './styles';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import Routes from '../../../../constants/navigation/Routes';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../constants/urls';
import { useSelector } from 'react-redux';
import { mmStorage } from '../../../../util/notifications';
import { STORAGE_IDS } from '../../../../util/notifications/settings/storage/constants';
import VIEWS from './constants';

const ViewSettings = ({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const isFullScreenModal = route?.params?.isFullScreenModal;

  useEffect(
    () => {
      navigation.setOptions(
        getNavigationOptionsTitle(
          strings('app_settings.views.title'),
          navigation,
          isFullScreenModal,
          colors,
          null,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  return (
    <View style={styles.wrapper}>
      <Text
        variant={TextVariant.HeadingMD}
        color={TextColor.Default}
        style={styles.textTitle}
      >
        {strings('app_settings.views.settings.card.title')}
      </Text>
      <View style={styles.card}>
        <Image source={ViewCardPlaceholder} style={styles.image} />
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.textSpace}
      >
        {strings('app_settings.views.settings.card.description')}
      </Text>

      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {strings('app_settings.views.settings.card.manage_preferences_1')}
        <Text variant={TextVariant.BodyMDBold} color={TextColor.Alternative}>
          {strings('app_settings.views.settings.card.manage_preferences_2')}
        </Text>
      </Text>

      <View style={styles.btnContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('app_settings.views.settings.card.cta')}
          onPress={() =>
            mmStorage.saveLocal(STORAGE_IDS.CURRENT_VIEW, VIEWS.DEFAULT)
          }
          style={styles.ctaBtn}
        />
      </View>
    </View>
  );
};

export default ViewSettings;

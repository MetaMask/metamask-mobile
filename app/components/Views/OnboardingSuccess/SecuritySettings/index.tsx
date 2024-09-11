// packages
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// internal
import { selectUseSafeChainsListValidation } from '../../../../selectors/preferencesController';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import styles from './index.styles';
import { useTheme } from '../../../../util/theme';
import { toggleUseSafeChainsListValidation } from '../../../../util/networks';
import { USE_SAFE_CHAINS_LIST_VALIDATION } from '../../Settings/SecuritySettings/SecuritySettings.constants';
const SecuritySettings = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  const renderBackButton = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
      </TouchableOpacity>
    ),
    [navigation],
  );
  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('default_settings.drawer_security_title')}
      </Text>
    ),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  const renderNetworkDetailsCheck = useCallback(
    () => (
      <View style={styles.halfSetting} testID={USE_SAFE_CHAINS_LIST_VALIDATION}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('wallet.network_details_check')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={useSafeChainsListValidation}
              onValueChange={toggleUseSafeChainsListValidation}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.use_safe_chains_list_validation_desc_1')}
          <Text variant={TextVariant.BodyMDBold}>chainid.network </Text>
          {strings('app_settings.use_safe_chains_list_validation_desc_2')}{' '}
          chainid.network
        </Text>
      </View>
    ),
    [colors, useSafeChainsListValidation, theme.brandColors],
  );

  return (
    <ScrollView style={styles.root}>{renderNetworkDetailsCheck()}</ScrollView>
  );
};

export default SecuritySettings;

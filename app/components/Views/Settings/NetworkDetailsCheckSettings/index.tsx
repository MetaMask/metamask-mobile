import React from 'react';
import { View, Switch } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import { selectUseSafeChainsListValidation } from '../../../../selectors/preferencesController';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { toggleUseSafeChainsListValidation } from '../../../../util/networks/engineNetworkUtils';
import {
  USE_SAFE_CHAINS_LIST_VALIDATION,
  DISPLAY_SAFE_CHAINS_LIST_VALIDATION,
} from './index.constants';
import styleSheet from './index.styles';

const NetworkDetailsCheckSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, {});

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  return (
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
            testID={DISPLAY_SAFE_CHAINS_LIST_VALIDATION}
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
  );
};

export default NetworkDetailsCheckSettings;

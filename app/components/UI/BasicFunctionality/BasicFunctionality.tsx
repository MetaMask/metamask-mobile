import React from 'react';
import { View, Switch, Linking } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../app/util/theme';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../app/reducers';
import styles from './BasicFunctionality.styles';
import { BasicFunctionalityComponentProps } from './BasicFunctionality.types';
import AppConstants from '../../../core/AppConstants';

export default function BasicFunctionalityComponent({
  handleSwitchToggle,
}: Readonly<BasicFunctionalityComponentProps>) {
  const theme = useTheme();
  const { colors } = theme;
  const isEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_POLICY_2024);
  };

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('default_settings.basic_functionality')}
        </Text>
        <Switch
          value={isEnabled}
          onChange={handleSwitchToggle}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white['000']}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {strings('default_settings.functionality_body')}
        <Text color={TextColor.Info} onPress={handleLink}>
          {strings('default_settings.privacy_policy')}
        </Text>
        {strings('default_settings.functionality_body2')}
      </Text>
    </View>
  );
}

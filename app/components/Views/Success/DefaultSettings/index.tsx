import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../app/constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import BasicFunctionalityComponent from '../../../../components/UI/BasicFunctionality/BasicFunctionality';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '400',
  },
  setting: {
    marginTop: 32,
  },
  toggle: {
    flexDirection: 'row',
    marginLeft: 16,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

const DefaultSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const [isEnabled, setIsEnabled] = useState(true);
  const navigation = useNavigation();
  const handleSwitchToggle = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
      params: { isEnabled },
    });
  };

  return (
    <ScrollView style={styles.root}>
      <Text variant={TextVariant.BodyMD}>
        {strings('default_settings.description')}
      </Text>
      <BasicFunctionalityComponent
        handleSwitchToggle={handleSwitchToggle}
        isEnabled={isEnabled}
      />
      <View style={styles.setting}>
        <View style={styles.heading}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('default_settings.manage_networks')}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('default_settings.manage_networks_body')}
        </Text>
        <Switch
          value={isEnabled}
          onValueChange={setIsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white['000']}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
    </ScrollView>
  );
};

export default DefaultSettings;

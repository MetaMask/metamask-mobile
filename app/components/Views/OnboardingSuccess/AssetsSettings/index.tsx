// third party dependencies
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';

// internal dependencies
import Engine from '../../../../core/Engine';
import { selectUseTokenDetection } from '../../../../selectors/preferencesController';
import { selectChainId } from '../../../../selectors/networkController';
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

const AssetSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const chainId = useSelector(selectChainId);

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
        {strings('default_settings.drawer_assets_title')}
      </Text>
    ),
    [],
  );
  // TODO: Fix type
  const toggleTokenDetection = (detectionStatus: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTokenDetection(detectionStatus);
  };

  const renderTokenDetectionSection = () => {
    // const { isTokenDetectionEnabled, chainId } = this.props;
    // const { styles, colors } = this.getStyles();
    // const theme = this.context || mockTheme;
    if (!isTokenDetectionSupportedForNetwork(chainId)) {
      return null;
    }
    return (
      <View
        style={styles.setting}
        // testID={AdvancedViewSelectorsIDs.TOKEN_DETECTION_TOGGLE}
      >
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.token_detection_title')}
          </Text>
          <View style={styles.toggle}>
            <Switch
              value={isTokenDetectionEnabled}
              onValueChange={toggleTokenDetection}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              ios_backgroundColor={colors.border.muted}
              style={styles.switch}
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.token_detection_description')}
        </Text>
      </View>
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  return (
    <ScrollView style={styles.root}>{renderTokenDetectionSection()}</ScrollView>
  );
};

export default AssetSettings;

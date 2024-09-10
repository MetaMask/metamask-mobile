// third party dependencies
import React, {
  useCallback,
  useLayoutEffect,
  useState,
  useEffect,
} from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';

// internal dependencies
import Engine from '../../../../core/Engine';
import SelectComponent from '../../../UI/SelectComponent';
import ipfsGateways from '../../../../util/ipfs-gateways.json';
import { timeoutFetch } from '../../../../util/general';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
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
import createStyles from './index.styles';
import { useTheme } from '../../../../util/theme';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  selectDisplayNftMedia,
  selectUseNftDetection,
  selectIsIpfsGatewayEnabled,
  selectIpfsGateway,
} from '../../../../selectors/preferencesController';
import { Gateway } from '../../Settings/SecuritySettings/SecuritySettings.types';
import {
  HASH_STRING,
  HASH_TO_TEST,
} from '../../Settings/SecuritySettings/SecuritySettings.constants';

const AssetSettings = () => {
  const { trackEvent, isEnabled, addTraitsToUser } = useMetrics();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const [gotAvailableGateways, setGotAvailableGateways] = useState(false);
  const [onlineIpfsGateways, setOnlineIpfsGateways] = useState<Gateway[]>([]);

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const chainId = useSelector(selectChainId);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const useNftDetection = useSelector(selectUseNftDetection);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const ipfsGateway = useSelector(selectIpfsGateway);

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
    // TODO: Remember to ask why we needed mock styles
    // in "AdvancedSettings" component
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

  const toggleDisplayNftMedia = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setDisplayNftMedia(value);
    if (!value) PreferencesController?.setUseNftDetection(value);
  };

  const renderDisplayNftMedia = useCallback(
    () => (
      <View
        style={styles.halfSetting}
        // testID={NFT_DISPLAY_MEDIA_MODE_SECTION}
      >
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.display_nft_media')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={displayNftMedia}
              onValueChange={toggleDisplayNftMedia}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
              testID="display-nft-toggle"
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.display_nft_media_desc_new')}
        </Text>
      </View>
    ),
    [colors, styles, displayNftMedia, theme],
  );

  const toggleNftAutodetect = useCallback(
    (value) => {
      const { PreferencesController } = Engine.context;
      if (value) {
        PreferencesController.setDisplayNftMedia(value);
      }
      PreferencesController.setUseNftDetection(value);
      const traits = {
        [UserProfileProperty.NFT_AUTODETECTION]: value
          ? UserProfileProperty.ON
          : UserProfileProperty.OFF,
      };
      addTraitsToUser(traits);
      trackEvent(MetaMetricsEvents.NFT_AUTO_DETECTION_ENABLED, {
        ...traits,
        location: 'app_settings',
      });
    },
    [addTraitsToUser, trackEvent],
  );

  const renderAutoDetectNft = useCallback(
    () => (
      <View
        style={styles.setting}
        // TODO: Why do we need ref
        // ref={detectNftComponentRef}
        // testID={NFT_AUTO_DETECT_MODE_SECTION}
      >
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.nft_autodetect_mode')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={useNftDetection}
              onValueChange={toggleNftAutodetect}
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
          {strings('app_settings.autodetect_nft_desc')}
        </Text>
      </View>
    ),
    [colors, styles, useNftDetection, theme, toggleNftAutodetect],
  );

  const setIsIpfsGatewayEnabled = (isIpfsGatewatEnabled: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIsIpfsGatewayEnabled(isIpfsGatewatEnabled);
  };

  const setIpfsGateway = (gateway: string) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIpfsGateway(gateway);
  };

  const renderIpfsGateway = () => (
    <View
      style={styles.setting}
      // testID={IPFS_GATEWAY_SECTION}
    >
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.ipfs_gateway')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={isIpfsGatewayEnabled}
            onValueChange={setIsIpfsGatewayEnabled}
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
        {strings('app_settings.ipfs_gateway_content')}
      </Text>
      {isIpfsGatewayEnabled && (
        <View style={styles.accessory}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.desc}
          >
            {strings('app_settings.ipfs_gateway_desc')}
          </Text>
          <View style={styles.picker}>
            {gotAvailableGateways ? (
              <SelectComponent
                selectedValue={ipfsGateway}
                defaultValue={strings('app_settings.ipfs_gateway_down')}
                onValueChange={setIpfsGateway}
                label={strings('app_settings.ipfs_gateway')}
                options={onlineIpfsGateways}
              />
            ) : (
              <View>
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const handleAvailableIpfsGateways = useCallback(async () => {
    if (!isIpfsGatewayEnabled) return;
    const ipfsGatewaysPromises = ipfsGateways.map(async (gateway: Gateway) => {
      const testUrl =
        gateway.value + HASH_TO_TEST + '#x-ipfs-companion-no-redirect';
      try {
        const res = await timeoutFetch(testUrl, 1200);
        const text = await res.text();
        const available = text.trim() === HASH_STRING.trim();
        return { ...gateway, available };
      } catch (e) {
        const available = false;
        return { ...gateway, available };
      }
    });
    const ipfsGatewaysAvailability = await Promise.all(ipfsGatewaysPromises);
    const onlineGateways = ipfsGatewaysAvailability.filter(
      (gateway) => gateway.available,
    );

    const sortedOnlineIpfsGateways = [...onlineGateways].sort(
      (a, b) => a.key - b.key,
    );

    setGotAvailableGateways(true);
    setOnlineIpfsGateways(sortedOnlineIpfsGateways);
  }, [isIpfsGatewayEnabled]);

  useEffect(() => {
    handleAvailableIpfsGateways();
  }, [handleAvailableIpfsGateways]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  return (
    <ScrollView style={styles.root}>
      {renderTokenDetectionSection()}
      {renderDisplayNftMedia()}
      {renderAutoDetectNft()}
      {renderIpfsGateway()}
    </ScrollView>
  );
};

export default AssetSettings;

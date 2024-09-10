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
import { useSelector } from 'react-redux';
import images from 'images/image-icons';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import { ETHERSCAN_SUPPORTED_NETWORKS } from '@metamask/transaction-controller';
import { EtherscanSupportedHexChainId } from '@metamask/preferences-controller';

// internal dependencies
import Engine from '../../../../core/Engine';
import SelectComponent from '../../../UI/SelectComponent';
import Cell from '../../../..//component-library/components/Cells/Cell/Cell';
import { CellVariant } from '../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
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
  selectShowIncomingTransactionNetworks,
  selectShowTestNetworks,
  selectIsMultiAccountBalancesEnabled,
} from '../../../../selectors/preferencesController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import {
  Gateway,
  NetworksI,
} from '../../Settings/SecuritySettings/SecuritySettings.types';
import {
  HASH_STRING,
  HASH_TO_TEST,
  BATCH_BALANCE_REQUESTS_SECTION,
} from '../../Settings/SecuritySettings/SecuritySettings.constants';
import Networks, {
  getAllNetworks,
  getNetworkImageSource,
} from '../../../../util/networks';

const AssetSettings = () => {
  const { trackEvent, addTraitsToUser } = useMetrics();
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
  const showIncomingTransactionsNetworks = useSelector(
    selectShowIncomingTransactionNetworks,
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );

  const myNetworks = ETHERSCAN_SUPPORTED_NETWORKS;

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

  const renderShowIncomingTransactions = () => {
    const renderMainnet = () => {
      const { name: mainnetName, chainId } = Networks.mainnet;
      return (
        <Cell
          variant={CellVariant.Display}
          title={mainnetName}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: mainnetName,
            imageSource: images.ETHEREUM,
          }}
          secondaryText="etherscan.io"
          style={styles.cellBorder}
        >
          <Switch
            value={showIncomingTransactionsNetworks[chainId]}
            onValueChange={(value) =>
              toggleEnableIncomingTransactions(
                chainId as EtherscanSupportedHexChainId,
                value,
              )
            }
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </Cell>
      );
    };

    const renderLineaMainnet = () => {
      const { name: lineaMainnetName, chainId } = Networks['linea-mainnet'];

      return (
        <Cell
          variant={CellVariant.Display}
          title={lineaMainnetName}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: lineaMainnetName,
            imageSource: images['LINEA-MAINNET'],
          }}
          secondaryText="lineascan.build"
          style={styles.cellBorder}
        >
          <Switch
            value={showIncomingTransactionsNetworks[chainId]}
            onValueChange={(value) =>
              toggleEnableIncomingTransactions(
                chainId as EtherscanSupportedHexChainId,
                value,
              )
            }
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </Cell>
      );
    };

    const toggleEnableIncomingTransactions = (
      hexChainId: EtherscanSupportedHexChainId,
      value: boolean,
    ) => {
      const { PreferencesController } = Engine.context;
      PreferencesController.setEnableNetworkIncomingTransactions(
        hexChainId,
        value,
      );
    };

    const renderRpcNetworks = () =>
      Object.values(networkConfigurations).map(
        ({ nickname, rpcUrl, chainId }) => {
          if (!chainId) return null;

          if (!Object.keys(myNetworks).includes(chainId)) return null;

          const { name } = { name: nickname || rpcUrl };
          //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
          const image = getNetworkImageSource({ chainId: chainId?.toString() });

          return (
            <Cell
              key={chainId}
              variant={CellVariant.Display}
              title={name}
              secondaryText={
                myNetworks[chainId as keyof typeof myNetworks].domain
              }
              avatarProps={{
                variant: AvatarVariant.Network,
                name,
                imageSource: image,
              }}
              style={styles.cellBorder}
            >
              <Switch
                value={showIncomingTransactionsNetworks[chainId]}
                onValueChange={(value) =>
                  toggleEnableIncomingTransactions(
                    chainId as EtherscanSupportedHexChainId,
                    value,
                  )
                }
                trackColor={{
                  true: colors.primary.default,
                  false: colors.border.muted,
                }}
                thumbColor={theme.brandColors.white}
                style={styles.switch}
                ios_backgroundColor={colors.border.muted}
              />
            </Cell>
          );
        },
      );

    const renderOtherNetworks = () => {
      const NetworksTyped = Networks as NetworksI;
      const getOtherNetworks = () => getAllNetworks().slice(2);
      return getOtherNetworks().map((networkType) => {
        const { name, imageSource, chainId } = NetworksTyped[networkType];
        if (!chainId) return null;
        return (
          <Cell
            key={chainId}
            variant={CellVariant.Display}
            title={name}
            secondaryText={
              myNetworks[chainId as keyof typeof myNetworks].domain
            }
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource,
            }}
            style={styles.cellBorder}
          >
            <Switch
              value={showIncomingTransactionsNetworks[chainId]}
              onValueChange={(value) => {
                chainId &&
                  toggleEnableIncomingTransactions(
                    chainId as keyof typeof myNetworks,
                    value,
                  );
              }}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
            />
          </Cell>
        );
      });
    };

    return (
      <View
        style={styles.setting}
        // testID={SecurityPrivacyViewSelectorsIDs.INCOMING_TRANSACTIONS}
      >
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.incoming_transactions_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.incoming_transactions_content')}
        </Text>
        <View style={styles.transactionsContainer}>
          {renderMainnet()}
          {renderLineaMainnet()}
          {renderRpcNetworks()}
          {showTestNetworks && renderOtherNetworks()}
        </View>
      </View>
    );
  };

  const toggleIsMultiAccountBalancesEnabled = (
    multiAccountBalancesEnabled: boolean,
  ) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIsMultiAccountBalancesEnabled(
      multiAccountBalancesEnabled,
    );
  };

  const renderMultiAccountBalancesSection = () => (
    <View style={styles.halfSetting} testID={BATCH_BALANCE_REQUESTS_SECTION}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.batch_balance_requests_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={isMultiAccountBalancesEnabled}
            onValueChange={toggleIsMultiAccountBalancesEnabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            // {...generateTestId(
            //   Platform,
            //   SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
            // )}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.batch_balance_requests_description')}
      </Text>
    </View>
  );

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
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 75,
      }}
      style={styles.root}
    >
      {renderTokenDetectionSection()}
      {renderDisplayNftMedia()}
      {renderAutoDetectNft()}
      {renderIpfsGateway()}
      {renderShowIncomingTransactions()}
      {renderMultiAccountBalancesSection()}
    </ScrollView>
  );
};

export default AssetSettings;

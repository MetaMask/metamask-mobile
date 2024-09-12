// third party dependencies
import React, {
  useCallback,
  useLayoutEffect,
  useRef,
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
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import images from 'images/image-icons';

// internal dependencies
import { ETHERSCAN_SUPPORTED_NETWORKS } from '@metamask/transaction-controller';
import { EtherscanSupportedHexChainId } from '@metamask/preferences-controller';
import Engine from '../../../../core/Engine';
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
import {
  selectUseTokenDetection,
  selectDisplayNftMedia,
  selectUseNftDetection,
  selectIsIpfsGatewayEnabled,
  selectIpfsGateway,
  selectShowIncomingTransactionNetworks,
  selectShowTestNetworks,
  selectIsMultiAccountBalancesEnabled,
} from '../../../../selectors/preferencesController';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import {
  NFT_AUTO_DETECT_TOGGLE,
  NFT_DISPLAY_MEDIA_MODE_TOGGLE,
  NFT_AUTO_DETECT_TOGGLE_LABEL,
  IPFS_GATEWAY_TOGGLE,
  IPFS_GATEWAY_SELECTED,
  INCOMING_MAINNET_TOGGLE,
  INCOMING_LINEA_MAINNET_TOGGLE,
  INCOMING_RPC_TOGGLE,
  INCOMING_OTHER_NETWORK_TOGGLE,
  SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
} from './AssetSettings.constants';
import SelectComponent from '../../../UI/SelectComponent';
import ipfsGateways from '../../../../util/ipfs-gateways.json';
import {
  HASH_TO_TEST,
  HASH_STRING,
} from '../../Settings/SecuritySettings/SecuritySettings.constants';
import {
  Gateway,
  NetworksI,
} from '../../Settings/SecuritySettings/SecuritySettings.types';
import { timeoutFetch } from '../../../../util/general';
import Networks, {
  getAllNetworks,
  getNetworkImageSource,
} from '../../../../util/networks';
import Cell from '../../../..//component-library/components/Cells/Cell/Cell';
import { CellVariant } from '../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';

const AssetSettings = () => {
  const detectNftComponentRef = useRef<View>(null);
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
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const showIncomingTransactionsNetworks = useSelector(
    selectShowIncomingTransactionNetworks,
  );
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
    [navigation, styles.backButton],
  );

  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('default_settings.drawer_assets_title')}
      </Text>
    ),
    [],
  );

  const toggleTokenDetection = useCallback((value: boolean) => {
    Engine.context.PreferencesController.setUseTokenDetection(value);
  }, []);

  const renderTokenDetectionSection = () => {
    if (!isTokenDetectionSupportedForNetwork(chainId)) {
      return null;
    }
    return (
      <View style={styles.setting}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.token_detection_title')}
          </Text>
          <View style={styles.toggle}>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={strings('app_settings.token_detection_title')}
              value={isTokenDetectionEnabled}
              onValueChange={toggleTokenDetection}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              ios_backgroundColor={colors.border.muted}
              style={styles.switch}
              testID={NFT_AUTO_DETECT_TOGGLE_LABEL}
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
      <View style={styles.halfSetting}>
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
              testID={NFT_DISPLAY_MEDIA_MODE_TOGGLE}
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
      <View ref={detectNftComponentRef} style={styles.setting}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.nft_autodetect_mode')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              testID={NFT_AUTO_DETECT_TOGGLE}
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

  const setIsIpfsGatewayEnabled = (isIpfsGatewatEnabled: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIsIpfsGatewayEnabled(isIpfsGatewatEnabled);
  };

  const setIpfsGateway = (gateway: string) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIpfsGateway(gateway);
  };

  const renderIpfsGateway = () => (
    <View style={styles.setting}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.ipfs_gateway')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            testID={IPFS_GATEWAY_TOGGLE}
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
                testID={IPFS_GATEWAY_SELECTED}
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

  const renderShowIncomingTransactions = () => {
    const renderMainnet = () => {
      const { name: mainnetName, chainId: mainnetChainId } = Networks.mainnet;
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
            testID={INCOMING_MAINNET_TOGGLE}
            value={showIncomingTransactionsNetworks[mainnetChainId]}
            onValueChange={(value) =>
              toggleEnableIncomingTransactions(
                mainnetChainId as EtherscanSupportedHexChainId,
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
      const { name: lineaMainnetName, chainId: lineaMainnetChainId } =
        Networks['linea-mainnet'];

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
            testID={INCOMING_LINEA_MAINNET_TOGGLE}
            value={showIncomingTransactionsNetworks[lineaMainnetChainId]}
            onValueChange={(value) =>
              toggleEnableIncomingTransactions(
                lineaMainnetChainId as EtherscanSupportedHexChainId,
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

    const renderRpcNetworks = () =>
      Object.values(networkConfigurations).map(
        ({ nickname, rpcUrl, chainId: rpcChainId }) => {
          if (!chainId) return null;

          if (!Object.keys(myNetworks).includes(chainId)) return null;

          const { name } = { name: nickname || rpcUrl };
          //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
          const image = getNetworkImageSource({ chainId: chainId?.toString() });

          return (
            <Cell
              key={rpcChainId}
              variant={CellVariant.Display}
              title={name}
              secondaryText={
                myNetworks[rpcChainId as keyof typeof myNetworks].domain
              }
              avatarProps={{
                variant: AvatarVariant.Network,
                name,
                imageSource: image,
              }}
              style={styles.cellBorder}
            >
              <Switch
                testID={INCOMING_RPC_TOGGLE}
                value={showIncomingTransactionsNetworks[rpcChainId]}
                onValueChange={(value) =>
                  toggleEnableIncomingTransactions(
                    rpcChainId as EtherscanSupportedHexChainId,
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
        const {
          name,
          imageSource,
          chainId: otherChainId,
        } = NetworksTyped[networkType];
        if (!otherChainId) return null;
        return (
          <Cell
            key={otherChainId}
            variant={CellVariant.Display}
            title={name}
            secondaryText={
              myNetworks[otherChainId as keyof typeof myNetworks].domain
            }
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource,
            }}
            style={styles.cellBorder}
          >
            <Switch
              testID={INCOMING_OTHER_NETWORK_TOGGLE}
              value={showIncomingTransactionsNetworks[otherChainId]}
              onValueChange={(value) => {
                otherChainId &&
                  toggleEnableIncomingTransactions(
                    otherChainId as keyof typeof myNetworks,
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
      <View style={styles.setting}>
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
    <View style={styles.halfSetting}>
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
            testID={SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID}
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
      contentContainerStyle={styles.contentContainerStyle}
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

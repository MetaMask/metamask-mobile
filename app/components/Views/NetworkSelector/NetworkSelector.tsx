// Third party dependencies.
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import images from 'images/image-icons';
import { useNavigation } from '@react-navigation/native';
import { FrequentRpc } from '@metamask/preferences-controller';
import { ProviderConfig } from '@metamask/network-controller';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Cell, {
  CellVariants,
} from '../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../locales/i18n';
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import {
  selectFrequentRpcList,
  selectShowTestNetworks,
} from '../../../selectors/preferencesController';
import Networks, {
  compareRpcUrls,
  getAllNetworks,
  getNetworkImageSource,
  isTestNet,
  shouldShowLineaMainnetNetwork,
} from '../../../util/networks';
import { LINEA_MAINNET, MAINNET } from '../../../constants/network';
import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Engine from '../../../core/Engine';
import analyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { ADD_NETWORK_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import {
  NETWORK_SCROLL_ID,
  NETWORK_TEST_SWITCH_ID,
} from '../../../../wdio/screen-objects/testIDs/Components/NetworkListModal.TestIds';
import { colors as importedColors } from '../../../styles/common';
import { useAppTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

// Internal dependencies
import styles from './NetworkSelector.styles';

const NetworkSelector = () => {
  const { navigate } = useNavigation();
  const { colors } = useAppTheme();
  const sheetRef = useRef<SheetBottomRef>(null);
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const thirdPartyApiMode = useSelector(
    (state: any) => state.privacy.thirdPartyApiMode,
  );
  const [lineaMainnetReleased, setLineaMainnetReleased] = useState(false);

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const frequentRpcList: FrequentRpc[] = useSelector(selectFrequentRpcList);

  useEffect(() => {
    const shouldShowLineaMainnet = shouldShowLineaMainnetNetwork();

    if (shouldShowLineaMainnet) {
      setLineaMainnetReleased(shouldShowLineaMainnet);
    }
  }, []);

  const onNetworkChange = (type: string) => {
    const { NetworkController, CurrencyRateController } = Engine.context;
    CurrencyRateController.setNativeCurrency('ETH');
    NetworkController.setProviderType(type);
    thirdPartyApiMode &&
      setTimeout(() => {
        Engine.refreshTransactionHistory();
      }, 1000);

    sheetRef.current?.hide();

    analyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
      chain_id: providerConfig.chainId,
      from_network:
        providerConfig.type === 'rpc'
          ? providerConfig.nickname
          : providerConfig.type,
      to_network: type,
    });
  };

  const onSetRpcTarget = async (rpcTarget: string) => {
    const { CurrencyRateController, NetworkController } = Engine.context;

    const rpc = frequentRpcList.find(({ rpcUrl }: { rpcUrl: string }) =>
      compareRpcUrls(rpcUrl, rpcTarget),
    );

    if (rpc) {
      const { rpcUrl, chainId, ticker, nickname } = rpc;

      CurrencyRateController.setNativeCurrency(ticker);

      NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);

      sheetRef.current?.hide();
      analyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, {
        chain_id: providerConfig.chainId,
        from_network: providerConfig.type,
        to_network: nickname,
      });
    }
  };

  const renderMainnet = () => {
    const { name: mainnetName, chainId } = Networks.mainnet;
    return (
      <Cell
        variant={CellVariants.Select}
        title={mainnetName}
        avatarProps={{
          variant: AvatarVariants.Network,
          name: mainnetName,
          imageSource: images.ETHEREUM,
        }}
        isSelected={
          chainId.toString() === providerConfig.chainId &&
          !providerConfig.rpcTarget
        }
        onPress={() => onNetworkChange(MAINNET)}
        style={styles.networkCell}
      />
    );
  };

  const renderLineaMainnet = () => {
    const { name: lineaMainnetName, chainId } = Networks['linea-mainnet'];
    return (
      <Cell
        variant={CellVariants.Select}
        title={lineaMainnetName}
        avatarProps={{
          variant: AvatarVariants.Network,
          name: lineaMainnetName,
          imageSource: images['LINEA-MAINNET'],
        }}
        isSelected={chainId.toString() === providerConfig.chainId}
        onPress={() => onNetworkChange(LINEA_MAINNET)}
      />
    );
  };

  const renderRpcNetworks = () =>
    frequentRpcList.map(
      ({
        nickname,
        rpcUrl,
        chainId,
      }: {
        nickname?: string;
        rpcUrl: string;
        chainId?: number;
      }) => {
        if (!chainId) return null;
        const { name } = { name: nickname || rpcUrl };
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        const image = getNetworkImageSource({ chainId: chainId?.toString() });

        return (
          <Cell
            key={chainId}
            variant={CellVariants.Select}
            title={name}
            avatarProps={{
              variant: AvatarVariants.Network,
              name,
              imageSource: image,
            }}
            isSelected={Boolean(
              chainId.toString() === providerConfig.chainId &&
                providerConfig.rpcTarget,
            )}
            onPress={() => onSetRpcTarget(rpcUrl)}
            style={styles.networkCell}
          />
        );
      },
    );

  const renderOtherNetworks = () => {
    const getOtherNetworks = () => getAllNetworks().slice(2);
    return getOtherNetworks().map((network) => {
      const { name, imageSource, chainId, networkType } = Networks[network];

      return (
        <Cell
          key={chainId}
          variant={CellVariants.Select}
          title={name}
          avatarProps={{
            variant: AvatarVariants.Network,
            name,
            imageSource,
          }}
          isSelected={chainId.toString() === providerConfig.chainId}
          onPress={() => onNetworkChange(networkType)}
          style={styles.networkCell}
        />
      );
    });
  };

  const goToNetworkSettings = () => {
    sheetRef.current?.hide(() => {
      navigate(Routes.ADD_NETWORK, {
        shouldNetworkSwitchPopToWallet: false,
      });
    });
  };

  const renderTestNetworksSwitch = () => (
    <View style={styles.switchContainer}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Alternative}>
        {strings('networks.show_test_networks')}
      </Text>
      <Switch
        onValueChange={(value: boolean) => {
          const { PreferencesController } = Engine.context;
          PreferencesController.setShowTestNetworks(value);
        }}
        value={isTestNet(providerConfig.chainId) || showTestNetworks}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={importedColors.white}
        ios_backgroundColor={colors.border.muted}
        {...generateTestId(Platform, NETWORK_TEST_SWITCH_ID)}
        disabled={isTestNet(providerConfig.chainId)}
      />
    </View>
  );

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={strings('networks.select_network')} />
      <ScrollView {...generateTestId(Platform, NETWORK_SCROLL_ID)}>
        {renderMainnet()}
        {lineaMainnetReleased && renderLineaMainnet()}
        {renderRpcNetworks()}
        {renderTestNetworksSwitch()}
        {showTestNetworks && renderOtherNetworks()}
      </ScrollView>

      <Button
        variant={ButtonVariants.Secondary}
        label={strings('app_settings.network_add_network')}
        onPress={goToNetworkSettings}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        style={styles.addNetworkButton}
        {...generateTestId(Platform, ADD_NETWORK_BUTTON)}
      />
    </SheetBottom>
  );
};

export default NetworkSelector;

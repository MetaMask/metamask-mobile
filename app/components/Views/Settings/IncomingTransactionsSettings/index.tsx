// external packages
import React from 'react';
import { View, Switch } from 'react-native';
import { useSelector } from 'react-redux';
import images from 'images/image-icons';

// internal packages
import { EtherscanSupportedHexChainId } from '@metamask/preferences-controller';
import { ETHERSCAN_SUPPORTED_NETWORKS } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import {
  selectShowTestNetworks,
  selectShowIncomingTransactionNetworks,
} from '../../../../selectors/preferencesController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import createStyles from './IncomingTransactionsSettings.styles';
import {
  INCOMING_TRANSACTIONS,
  INCOMING_LINEA_MAINNET_TOGGLE,
  INCOMING_MAINNET_TOGGLE,
} from './IncomingTransactionsSettings.constants';
import Cell from '../../../..//component-library/components/Cells/Cell/Cell';
import { CellVariant } from '../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Networks, {
  getAllNetworks,
  getNetworkImageSource,
} from '../../../../util/networks';
import { NetworksI } from './IncomingTransactionsSettings.types';

const IncomingTransactionsSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const showTestNetworks = useSelector(selectShowTestNetworks);
  const showIncomingTransactionsNetworks = useSelector(
    selectShowIncomingTransactionNetworks,
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const myNetworks = ETHERSCAN_SUPPORTED_NETWORKS;

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
          testID={INCOMING_MAINNET_TOGGLE}
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
          testID={INCOMING_LINEA_MAINNET_TOGGLE}
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
          secondaryText={myNetworks[chainId as keyof typeof myNetworks].domain}
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
    <View style={styles.setting} testID={INCOMING_TRANSACTIONS}>
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

export default IncomingTransactionsSettings;

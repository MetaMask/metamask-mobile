import React from 'react';
import { View, ImageSourcePropType } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useStyles } from '../../../../component-library/hooks';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Networks, {
  getAllNetworks,
  getNetworkImageSource,
} from '../../../../util/networks';
import {
  selectShowTestNetworks,
  selectShowIncomingTransactionNetworks,
} from '../../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { EtherscanSupportedHexChainId } from '@metamask/preferences-controller';
import { NetworkConfiguration } from '@metamask/network-controller';
import styleSheet from './index.styles';
import {
  INCOMING_TRANSACTIONS,
  INCOMING_LINEA_MAINNET_TOGGLE,
  INCOMING_MAINNET_TOGGLE,
} from './index.constants';
import { NetworksI } from './index.types';
import NetworkCell from '../../../UI/NetworkCell/NetworkCell';
import { MAINNET, LINEA_MAINNET } from '../../../../../app/constants/network';
import { INCOMING_TRANSACTIONS_SUPPORTED_CHAIN_IDS } from '@metamask/transaction-controller';
import { CaipChainId, Hex } from '@metamask/utils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
import images from 'images/image-icons';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../selectors/multichainNetworkController';
///: END:ONLY_INCLUDE_IF

const IncomingTransactionsSettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const { PreferencesController } = Engine.context;
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const showIncomingTransactionsNetworks = useSelector(
    selectShowIncomingTransactionNetworks,
  );

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );
  ///: END:ONLY_INCLUDE_IF

  const toggleEnableIncomingTransactions = (
    hexChainId: Hex | CaipChainId,
    value: boolean,
  ) => {
    PreferencesController.setEnableNetworkIncomingTransactions(
      hexChainId as EtherscanSupportedHexChainId,
      value,
    );
  };

  const renderRpcNetworks = () => {
    const networks = Object.values(networkConfigurations);

    const mainnetNetworks = networks.filter(
      ({ chainId }) =>
        chainId === Networks[MAINNET].chainId ||
        chainId === Networks[LINEA_MAINNET].chainId,
    );

    const otherNetworks = networks.filter(
      ({ chainId }) =>
        chainId !== Networks[MAINNET].chainId &&
        chainId !== Networks[LINEA_MAINNET].chainId,
    );

    const renderNetwork = ({
      name: nickname,
      rpcEndpoints,
      chainId,
      defaultRpcEndpointIndex,
    }: NetworkConfiguration) => {
      if (
        !chainId ||
        !INCOMING_TRANSACTIONS_SUPPORTED_CHAIN_IDS.includes(chainId)
      )
        return null;

      const rpcUrl = rpcEndpoints[defaultRpcEndpointIndex].url;
      const { name } = { name: nickname || rpcUrl };

      let testId = '';
      if (chainId === Networks[MAINNET].chainId) {
        testId = INCOMING_MAINNET_TOGGLE;
      } else if (chainId === Networks[LINEA_MAINNET].chainId) {
        testId = INCOMING_LINEA_MAINNET_TOGGLE;
      }

      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      const image = getNetworkImageSource({ chainId: chainId?.toString() });

      return (
        <NetworkCell
          key={`${nickname}-${chainId}`}
          name={name}
          chainId={chainId as EtherscanSupportedHexChainId}
          imageSource={image}
          showIncomingTransactionsNetworks={showIncomingTransactionsNetworks}
          toggleEnableIncomingTransactions={toggleEnableIncomingTransactions}
          testID={testId}
        />
      );
    };

    return [...mainnetNetworks, ...otherNetworks].map(renderNetwork);
  };
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const renderNonEvmNetworks = () =>
    Object.values(nonEvmNetworkConfigurations)
      // TODO: - [SOLANA] - Remove this filter once we want to show non evm like BTC
      .filter((network) => network.chainId === SolScope.Mainnet)
      .map((network) => (
        <NetworkCell
          key={network.chainId}
          name={network.name}
          chainId={network.chainId}
          imageSource={images.SOLANA}
          //TODO: [SOLANA] Disabled for now. When activity view supports non evm, we should enable this
          showIncomingTransactionsNetworks={{
            [network.chainId]: false,
          }}
          toggleEnableIncomingTransactions={() => null}
          testID={'solana-incoming-transactions-toggle'}
        />
      ));
  ///: END:ONLY_INCLUDE_IF
  const renderOtherNetworks = () => {
    const NetworksTyped = Networks as NetworksI;
    const getOtherNetworks = () => getAllNetworks().slice(2);
    return getOtherNetworks().map((networkType) => {
      const { name, imageSource, chainId } = NetworksTyped[networkType];

      if (!chainId) return null;

      return (
        <NetworkCell
          key={`${name}-${chainId}`}
          name={name}
          chainId={chainId as Hex}
          imageSource={imageSource as ImageSourcePropType}
          showIncomingTransactionsNetworks={showIncomingTransactionsNetworks}
          toggleEnableIncomingTransactions={toggleEnableIncomingTransactions}
        />
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
        {renderRpcNetworks()}
        {
          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          renderNonEvmNetworks()
          ///: END:ONLY_INCLUDE_IF
        }
        {showTestNetworks && renderOtherNetworks()}
      </View>
    </View>
  );
};

export default IncomingTransactionsSettings;

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
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { EtherscanSupportedHexChainId } from '@metamask/preferences-controller';
import { ETHERSCAN_SUPPORTED_NETWORKS } from '@metamask/transaction-controller';
import styleSheet from './index.styles';
import {
  INCOMING_TRANSACTIONS,
  INCOMING_LINEA_MAINNET_TOGGLE,
  INCOMING_MAINNET_TOGGLE,
} from './index.constants';
import { NetworksI } from './index.types';
import NetworkCell from '../../../UI/NetworkCell/NetworkCell';

const IncomingTransactionsSettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const { PreferencesController } = Engine.context;
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const showIncomingTransactionsNetworks = useSelector(
    selectShowIncomingTransactionNetworks,
  );

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const supportedNetworks = ETHERSCAN_SUPPORTED_NETWORKS;

  const toggleEnableIncomingTransactions = (
    hexChainId: EtherscanSupportedHexChainId,
    value: boolean,
  ) => {
    PreferencesController.setEnableNetworkIncomingTransactions(
      hexChainId,
      value,
    );
  };

  const renderRpcNetworks = () =>
    Object.values(networkConfigurations).map(
      ({ name: nickname, rpcEndpoints, chainId, defaultRpcEndpointIndex }) => {
        const rpcUrl = rpcEndpoints[defaultRpcEndpointIndex].url;
        if (!chainId || !Object.keys(supportedNetworks).includes(chainId))
          return null;
        const { name } = { name: nickname || rpcUrl };

        let testId = '';
        if (name === 'Mainnet') {
          testId = INCOMING_MAINNET_TOGGLE;
        } else if (name === 'Linea Mainnet') {
          testId = INCOMING_LINEA_MAINNET_TOGGLE;
        }

        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        const image = getNetworkImageSource({ chainId: chainId?.toString() });
        const secondaryText =
          supportedNetworks[chainId as keyof typeof supportedNetworks].domain;
        return (
          <NetworkCell
            key={`${nickname}-${chainId}`}
            name={name}
            chainId={chainId as EtherscanSupportedHexChainId}
            imageSource={image}
            secondaryText={secondaryText}
            showIncomingTransactionsNetworks={showIncomingTransactionsNetworks}
            toggleEnableIncomingTransactions={toggleEnableIncomingTransactions}
            testID={testId}
          />
        );
      },
    );

  const renderOtherNetworks = () => {
    const NetworksTyped = Networks as NetworksI;
    const getOtherNetworks = () => getAllNetworks().slice(2);
    return getOtherNetworks().map((networkType) => {
      const { name, imageSource, chainId } = NetworksTyped[networkType];
      if (!chainId) return null;
      const secondaryText =
        supportedNetworks[chainId as keyof typeof supportedNetworks].domain;
      return (
        <NetworkCell
          key={`${name}-${chainId}`}
          name={name}
          chainId={chainId as keyof typeof supportedNetworks}
          imageSource={imageSource as ImageSourcePropType}
          secondaryText={secondaryText}
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
        {showTestNetworks && renderOtherNetworks()}
      </View>
    </View>
  );
};

export default IncomingTransactionsSettings;

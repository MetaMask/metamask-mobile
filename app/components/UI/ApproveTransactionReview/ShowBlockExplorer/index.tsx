import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { WebView } from 'react-native-webview';

import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { RPC } from '../../../../constants/network';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../../util/etherscan';
import { findBlockExplorerForRpc } from '../../../../util/networks';
import WebviewProgressBar from '../../../UI/WebviewProgressBar';

const styles = StyleSheet.create({
  progressBarWrapper: {
    height: 3,
    width: '100%',
    left: 0,
    right: 0,
    bottom: 0,
    position: 'absolute',
    zIndex: 999999,
  },
  container: {
    height: '100%',
  },
});

interface ShowBlockExplorerProps {
  address: string;
  type: string;
  setIsBlockExplorerVisible: (isBlockExplorerVisible: boolean) => void;
  headerWrapperStyle?: any;
  headerTextStyle?: any;
  iconStyle?: any;
  providerRpcTarget: string;
  frequentRpcList: any[];
  learnMoreURL?: string;
}

const ShowBlockExplorer = (props: ShowBlockExplorerProps) => {
  const {
    type,
    address,
    setIsBlockExplorerVisible,
    headerWrapperStyle,
    headerTextStyle,
    iconStyle,
    providerRpcTarget,
    frequentRpcList,
    learnMoreURL,
  } = props;

  const [loading, setLoading] = useState<number>(0);

  const url =
    learnMoreURL ||
    (type === RPC
      ? `${findBlockExplorerForRpc(
          providerRpcTarget,
          frequentRpcList,
        )}/address/${address}`
      : getEtherscanAddressUrl(type, address));
  const title =
    type === RPC
      ? new URL(findBlockExplorerForRpc(providerRpcTarget, frequentRpcList))
          .hostname
      : getEtherscanBaseUrl(type).replace('https://', '');

  const onLoadProgress = ({
    nativeEvent: { progress },
  }: {
    nativeEvent: { progress: number };
  }) => {
    setLoading(progress);
  };

  const renderProgressBar = () => (
    <View style={styles.progressBarWrapper}>
      <WebviewProgressBar progress={loading} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={headerWrapperStyle}>
        {!learnMoreURL && (
          <Text variant={TextVariant.BodyMDBold} style={headerTextStyle}>
            {title}
          </Text>
        )}
        <AntDesignIcon
          name={'close'}
          size={20}
          style={iconStyle}
          onPress={() => setIsBlockExplorerVisible(false)}
        />
      </View>
      <WebView source={{ uri: url }} onLoadProgress={onLoadProgress} />
      {renderProgressBar()}
    </SafeAreaView>
  );
};

export default ShowBlockExplorer;

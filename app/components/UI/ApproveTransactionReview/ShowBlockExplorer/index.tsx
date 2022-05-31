import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WebviewProgressBar from '../../../UI/WebviewProgressBar';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../../util/etherscan';
import { WebView } from 'react-native-webview';
import Text from '../../../Base/Text';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';

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
});

interface ShowBlockExplorerProps {
  contractAddress: string;
  type: string;
  setIsBlockExplorerVisible: (isBlockExplorerVisible: boolean) => void;
  headerWrapperStyle?: any;
  headerTextStyle?: any;
  iconStyle?: any;
}

const ShowBlockExplorer = (props: ShowBlockExplorerProps) => {
  const {
    type,
    contractAddress,
    setIsBlockExplorerVisible,
    headerWrapperStyle,
    headerTextStyle,
    iconStyle,
  } = props;
  const [loading, setLoading] = useState(0);
  const url = getEtherscanAddressUrl(type, contractAddress);
  const etherscan_url = getEtherscanBaseUrl(type).replace('https://', '');

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
    <>
      <View style={headerWrapperStyle}>
        <Text bold style={headerTextStyle}>
          {etherscan_url}
        </Text>
        <AntDesignIcon
          name={'close'}
          size={20}
          style={iconStyle}
          onPress={() => setIsBlockExplorerVisible(false)}
        />
      </View>
      <WebView source={{ uri: url }} onLoadProgress={onLoadProgress} />
      {renderProgressBar()}
    </>
  );
};

export default ShowBlockExplorer;

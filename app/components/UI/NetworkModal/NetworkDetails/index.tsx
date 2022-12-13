import React from 'react';
import { StyleSheet, View } from 'react-native';
import ConnectHeader from '../../../UI/ConnectHeader';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors: any) =>
  StyleSheet.create({
    accountInformation: {
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginBottom: 10,
    },
    bottomSpace: {
      marginBottom: 10,
    },
  });

interface NetworkDetailsProps {
  goBack: () => void;
  chainId: string;
  ticker: string;
  nickname: string;
  rpcUrl: string;
  blockExplorerUrl: string;
}

const NetworkDetails = (props: NetworkDetailsProps) => {
  const { goBack, chainId, ticker, nickname, rpcUrl, blockExplorerUrl } = props;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const DisplayData = [
    {
      title: strings('networks.network_display_name'),
      value: nickname,
    },
    {
      title: strings('networks.network_rpc_url'),
      value: rpcUrl,
    },
    {
      title: strings('networks.network_chain_id'),
      value: chainId,
    },
    {
      title: strings('networks.network_currency_symbol'),
      value: ticker,
    },
    {
      title: strings('networks.network_block_explorer_url'),
      value: blockExplorerUrl,
    },
  ];

  const DetailsView = () => (
    <>
      {DisplayData.map((item, index) => (
        <View key={index}>
          <Text black>{item.title}</Text>
          <Text black bold style={styles.bottomSpace}>
            {item.value}
          </Text>
        </View>
      ))}
    </>
  );

  return (
    <View>
      <ConnectHeader
        action={goBack}
        title={strings('networks.network_details')}
      />
      <View style={styles.accountInformation}>
        <DetailsView />
      </View>
    </View>
  );
};

export default NetworkDetails;

import { zeroAddress } from 'ethereumjs-util';
import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useDispatch, useSelector } from 'react-redux';
import { showAlert } from '../../../../actions/alert';
import i18n, { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Title from '../../../Base/Title';
import useTokenDescriptions, {
  TokenDescriptions,
} from '../../../hooks/useTokenDescriptions';
import { Asset } from '../AssetOverview.types';
import styleSheet from './TokenDetails.styles';
import { hexToBN } from '../../../../util/number';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import {
  formatAddress,
  getTokenDecimal,
  getTokenDetails,
  safeToChecksumAddress,
} from '../../../../util/address';
import ClipboardManager from '../../../../core/ClipboardManager';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
// import ContentDisplay from './ContentDisplay';

interface TokenDetailsProps {
  asset: Asset;
  chainId: string;
}

const skeletonProps = {
  width: '100%',
  height: 18,
  borderRadius: 6,
  marginBottom: 8,
};

const TokenDetails = ({ asset, chainId }: TokenDetailsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const tokenList = useSelector(selectTokenList);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const locale: keyof TokenDescriptions = i18n.locale;
  console.log('sanity');

  const tokenContractAddress = safeToChecksumAddress(
    asset.isETH ? zeroAddress() : asset.address,
  );

  if (!tokenContractAddress) {
    return null;
  }

  const tokenMetadata = tokenList[tokenContractAddress.toLowerCase()];
  const tokenMarketDetails = tokenExchangeRates[tokenContractAddress];

  if (!tokenMetadata) {
    return null;
  }

  if (!tokenMarketDetails) {
    return null;
  }

  const tokenDetails = {
    contractAddress: formatAddress(tokenContractAddress, 'short'),
    tokenDecimal: tokenMetadata.decimals,
    tokenList: tokenMetadata.aggregators.join(', '),
  };

  const marketDetails = {
    marketCap: tokenMarketDetails.marketCap.toFixed(2),
    totalVolume: tokenMarketDetails.totalVolume,
    volumeToMarketCap: `${
      tokenMarketDetails.totalVolume / tokenMarketDetails.marketCap
    }`,
    circulatingSupply: tokenMarketDetails.circulatingSupply,
    allTimeHigh: tokenMarketDetails.allTimeHigh,
    allTimeLow: tokenMarketDetails.allTimeLow,
    fullyDiluted: tokenMarketDetails.dilutedMarketCap,
  };

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(tokenMarketDetails.tokenAddress);

    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.wrapper}>
        <Title style={styles.title}>Token Details</Title>
        <View style={styles.listWrapper}>
          <View style={[styles.listItem, styles.firstChild]}>
            <Text style={styles.listItemLabel}>Contract address</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyAccountToClipboard}
            >
              <Text color={TextColor.Primary} variant={TextVariant.BodySM}>
                {tokenDetails.contractAddress}
              </Text>
              <Icon
                name={IconName.Copy}
                size={IconSize.Sm}
                color={IconColor.Primary}
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.listItem}>
            <Text>Token Decimal</Text>
            <Text>{tokenDetails.tokenDecimal}</Text>
          </View>
          <View style={[styles.listItemStacked, styles.lastChild]}>
            <Text>Token list</Text>
            <Text>{tokenDetails.tokenList}</Text>
          </View>
        </View>
      </View>
      <View style={styles.wrapper}>
        <Title style={styles.title}>Market Details</Title>
        <View style={styles.listWrapper}>
          <View style={[styles.listItem, styles.firstChild]}>
            <Text style={styles.listItemLabel}>Market Cap</Text>
            <Text>{marketDetails.marketCap}</Text>
          </View>
          <View style={styles.listItem}>
            <Text>Total Volume (24h)</Text>
            <Text>{marketDetails.totalVolume}</Text>
          </View>
          <View style={styles.listItem}>
            <Text>Volume / Market Cap</Text>
            <Text>{marketDetails.volumeToMarketCap}</Text>
          </View>
          <View style={styles.listItem}>
            <Text>Circulating supply</Text>
            <Text>{marketDetails.circulatingSupply}</Text>
          </View>
          <View style={styles.listItem}>
            <Text>All time high</Text>
            <Text>{marketDetails.allTimeHigh}</Text>
          </View>
          <View style={styles.listItem}>
            <Text>All time low</Text>
            <Text>{marketDetails.allTimeLow}</Text>
          </View>
          <View style={styles.listItem}>
            <Text>Fully diluted</Text>
            <Text>{marketDetails.fullyDiluted}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TokenDetails;

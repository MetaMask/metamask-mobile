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
import { TokenDescriptions } from '../../../hooks/useTokenDescriptions';
import { Asset } from '../AssetOverview.types';
import styleSheet from './TokenDetails.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { formatAddress, safeToChecksumAddress } from '../../../../util/address';
import ClipboardManager from '../../../../core/ClipboardManager';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
// import ContentDisplay from './ContentDisplay';

interface TokenDetailsProps {
  asset: Asset;
}

interface TokenDetailsListProps {
  tokenDetails: TokenDetails;
}

type TokenDetails = {
  contractAddress: string;
  tokenDecimal: number;
  tokenList: string;
};

interface MarketDetailsListProps {
  marketDetails: MarketDetails;
}

type MarketDetails = {
  marketCap: string;
  totalVolume: number;
  volumeToMarketCap: number | null;
  circulatingSupply: number;
  allTimeHigh: number;
  allTimeLow: number;
  fullyDiluted: number;
};

const skeletonProps = {
  width: '100%',
  height: 18,
  borderRadius: 6,
  marginBottom: 8,
};

const TokenDetails: React.FC<TokenDetailsProps> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});
  const tokenList = useSelector(selectTokenList);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const locale: keyof TokenDescriptions = i18n.locale;

  const tokenContractAddress = safeToChecksumAddress(
    asset.isETH ? zeroAddress() : asset.address,
  );

  if (!tokenContractAddress) {
    return null;
  }

  const tokenMetadata = tokenList[tokenContractAddress.toLowerCase()];
  const tokenMarketDetails = tokenExchangeRates[tokenContractAddress];

  if (!tokenMetadata) {
    console.log("can't find tokenMetadata");
    return null;
  }

  if (!tokenMarketDetails) {
    console.log("can't find tokenMarketDetails");
    return null;
  }

  const tokenDetails: TokenDetails = {
    contractAddress: formatAddress(tokenContractAddress, 'short'),
    tokenDecimal: tokenMetadata.decimals,
    tokenList: tokenMetadata.aggregators.join(', '),
  };

  const marketDetails: MarketDetails = {
    marketCap: tokenMarketDetails.marketCap.toFixed(2),
    totalVolume: tokenMarketDetails.totalVolume,
    volumeToMarketCap:
      tokenMarketDetails.marketCap <= 0
        ? null
        : tokenMarketDetails.totalVolume / tokenMarketDetails.marketCap,
    circulatingSupply: tokenMarketDetails.circulatingSupply,
    allTimeHigh: tokenMarketDetails.allTimeHigh,
    allTimeLow: tokenMarketDetails.allTimeLow,
    fullyDiluted: tokenMarketDetails.dilutedMarketCap,
  };

  return (
    <View style={styles.wrapper}>
      <TokenDetailsList tokenDetails={tokenDetails} />
      <MarketDetailsList marketDetails={marketDetails} />
    </View>
  );
};

const TokenDetailsList: React.FC<TokenDetailsListProps> = ({
  tokenDetails,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(tokenDetails.contractAddress);

    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
  };
  return (
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
  );
};

const MarketDetailsList: React.FC<MarketDetailsListProps> = ({
  marketDetails,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
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
        {marketDetails.volumeToMarketCap && (
          <View style={styles.listItem}>
            <Text>Volume / Market Cap</Text>
            <Text>{marketDetails.volumeToMarketCap}</Text>
          </View>
        )}
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
  );
};

export default TokenDetails;

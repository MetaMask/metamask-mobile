import { zeroAddress } from 'ethereumjs-util';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
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
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import {
  convertDecimalToPercentage,
  localizeLargeNumber,
} from '../../../../util/number';
import { formatCurrency } from '../../../../util/confirm-tx';

interface TokenDetailsProps {
  asset: Asset;
}

interface TokenDetailsListProps {
  tokenDetails: TokenDetails;
}

interface TokenDetails {
  contractAddress: string | null;
  tokenDecimal: number | null;
  tokenList: string | null;
}

interface MarketDetailsListProps {
  marketDetails: MarketDetails;
}

interface MarketDetails {
  marketCap: string | null;
  totalVolume: number | null;
  volumeToMarketCap: string | null;
  circulatingSupply: number | null;
  allTimeHigh: string | null;
  allTimeLow: string | null;
  fullyDiluted: number | null;
}

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
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const tokenContractAddress = safeToChecksumAddress(asset.address);

  if (!tokenContractAddress) {
    console.log("can't find contract address");
    return null;
  }

  if (!conversionRate || conversionRate < 0) {
    console.log('invalid conversion rate');
    return null;
  }

  const tokenMetadata = tokenList[tokenContractAddress.toLowerCase()];
  const marketData = tokenExchangeRates[tokenContractAddress];

  // why isn't zeroAddress() in TokenList?
  const tokenDetails: TokenDetails = asset.isETH
    ? {
        contractAddress: formatAddress(zeroAddress(), 'short'),
        tokenDecimal: 18,
        tokenList: '',
      }
    : {
        contractAddress: formatAddress(tokenContractAddress, 'short') || null,
        tokenDecimal: tokenMetadata.decimals || null,
        tokenList: tokenMetadata.aggregators.join(', ') || null,
      };

  const marketDetails: MarketDetails = {
    marketCap:
      marketData?.marketCap > 0
        ? localizeLargeNumber(i18n, conversionRate * marketData.marketCap)
        : null,
    totalVolume:
      marketData?.totalVolume > 0
        ? localizeLargeNumber(i18n, conversionRate * marketData.totalVolume)
        : null,
    volumeToMarketCap:
      marketData?.marketCap > 0
        ? convertDecimalToPercentage(
            marketData.totalVolume / marketData.marketCap,
          )
        : null,
    circulatingSupply:
      marketData?.circulatingSupply > 0
        ? localizeLargeNumber(i18n, marketData.circulatingSupply)
        : null,
    allTimeHigh:
      marketData?.allTimeHigh > 0
        ? formatCurrency(
            conversionRate * marketData.allTimeHigh,
            currentCurrency,
          )
        : null,
    allTimeLow:
      marketData?.allTimeLow > 0
        ? formatCurrency(
            conversionRate * marketData.allTimeLow,
            currentCurrency,
          )
        : null,
    fullyDiluted:
      marketData?.dilutedMarketCap > 0
        ? localizeLargeNumber(i18n, marketData.dilutedMarketCap)
        : null,
  };

  return (
    <View style={styles.wrapper}>
      {(asset.isETH || tokenMetadata) && (
        <TokenDetailsList tokenDetails={tokenDetails} />
      )}
      {marketData && <MarketDetailsList marketDetails={marketDetails} />}
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
      <Title style={styles.title}>{strings('token.token_details')}</Title>
      <View style={styles.listWrapper}>
        {tokenDetails.contractAddress && (
          <View style={[styles.listItem, styles.firstChild]}>
            <Text style={styles.listItemLabel}>
              {strings('token.contract_address')}
            </Text>
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
        )}
        {tokenDetails.tokenDecimal && (
          <View style={styles.listItem}>
            <Text>{strings('token.token_decimal')}</Text>
            <Text>{tokenDetails.tokenDecimal}</Text>
          </View>
        )}
        {tokenDetails.tokenList && (
          <View style={[styles.listItemStacked, styles.lastChild]}>
            <Text>{strings('token.token_list')}</Text>
            <Text>{tokenDetails.tokenList}</Text>
          </View>
        )}
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
        {marketDetails.marketCap && (
          <View style={[styles.listItem, styles.firstChild]}>
            <Text style={styles.listItemLabel}>
              {strings('token.market_cap')}
            </Text>
            <Text>{marketDetails.marketCap}</Text>
          </View>
        )}
        {marketDetails.totalVolume && (
          <View style={styles.listItem}>
            <Text>{strings('token.total_volume')}</Text>
            <Text>{marketDetails.totalVolume}</Text>
          </View>
        )}
        {marketDetails.volumeToMarketCap && (
          <View style={styles.listItem}>
            <Text>{strings('token.volume_to_marketcap')}</Text>
            <Text>{marketDetails.volumeToMarketCap}</Text>
          </View>
        )}
        {marketDetails.circulatingSupply && (
          <View style={styles.listItem}>
            <Text>{strings('token.circulating_supply')}</Text>
            <Text>{marketDetails.circulatingSupply}</Text>
          </View>
        )}
        {marketDetails.allTimeHigh && (
          <View style={styles.listItem}>
            <Text>{strings('token.all_time_high')}</Text>
            <Text>{marketDetails.allTimeHigh}</Text>
          </View>
        )}
        {marketDetails.allTimeLow && (
          <View style={styles.listItem}>
            <Text>{strings('token.all_time_low')}</Text>
            <Text>{marketDetails.allTimeLow}</Text>
          </View>
        )}
        {marketDetails.fullyDiluted && (
          <View style={styles.listItem}>
            <Text>{strings('token.fully_diluted')}</Text>
            <Text>{marketDetails.fullyDiluted}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TokenDetails;

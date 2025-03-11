import React from 'react';
import { View, ImageSourcePropType } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { TokenI } from '../Tokens/types';
import AssetElement from '../AssetElement';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../NetworkAssetLogo';
import Text, { TextVariant, TextColor } from '../../../component-library/components/Texts/Text';
import { balanceToFiat, renderFromTokenMinimalUnit } from '../../../util/number';
import { selectCurrentCurrency, selectConversionRate } from '../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectChainId } from '../../../selectors/networkController';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';

interface TokenSelectorItemProps {
  token: TokenI;
  onPress: (token: TokenI) => void;
  networkName: string;
  networkImageSource?: ImageSourcePropType;
  styles: {
    ethLogo: {
      width: number;
      height: number;
    };
    balances: {
      flex: number;
      marginLeft: number;
    };
    assetName: {
      flexDirection: 'column';
    };
    tokenSymbol: {
      marginBottom: number;
    };
  };
}

export const TokenSelectorItem: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
  styles,
}) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const currentChainId = useSelector(selectChainId) as Hex;
  const tokenBalances = useSelector(selectTokensBalances);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress) as Hex;

  // Get raw balance from tokenBalances
  const rawBalance = token.isNative
    ? token.balance
    : tokenBalances?.[selectedAddress]?.[currentChainId]?.[token.address as Hex] || '0';

  // Format balance using renderFromTokenMinimalUnit
  const formattedBalance = token.isNative
    ? token.balance
    : renderFromTokenMinimalUnit(rawBalance, token.decimals);
  const hasBalance = parseFloat(formattedBalance) > 0;

  // Calculate fiat value
  const exchangeRate = token.address ? tokenExchangeRates?.[token.address as Hex]?.price : undefined;
  const fiatValue = hasBalance ? balanceToFiat(
    formattedBalance,
    conversionRate,
    exchangeRate,
    currentCurrency
  ) : undefined;

  const balanceWithSymbol = hasBalance ? `${formattedBalance} ${token.symbol}` : undefined;

  if (token.isNative) {
    console.log('HELLO', { token });
  }

  return (
    <AssetElement
      key={token.address}
      asset={token}
      onPress={() => onPress(token)}
      mainBalance={balanceWithSymbol}
      balance={fiatValue}
    >
      <BadgeWrapper
        badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={networkImageSource}
          />
        }
      >
        {token.isNative ? (
          <NetworkAssetLogo
            chainId={currentChainId}
            style={styles.ethLogo}
            ticker={token.ticker || ''}
            big={false}
            biggest={false}
            testID={`network-logo-${token.symbol}`}
          />
        ) : (
          <AvatarToken
            name={token.symbol}
            imageSource={token.image ? { uri: token.image } : undefined}
            size={AvatarSize.Md}
          />
        )}
      </BadgeWrapper>
      <View style={styles.balances}>
        <View style={styles.assetName}>
          <Text
            variant={TextVariant.BodyLGMedium}
            style={styles.tokenSymbol}
          >
            {token.symbol}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
          >
            {token.name}
          </Text>
        </View>
      </View>
    </AssetElement>
  );
};

import React from 'react';
import { View, FlatList } from 'react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import I18n, { strings } from '../../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import AssetElement from '../../AssetElement';
import { formatWithThreshold } from '../../../../util/assets';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { toHex } from '@metamask/controller-utils';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import {
  PopularList,
  CustomNetworkImgMapping,
  UnpopularNetworkList,
} from '../../../../util/networks/customNetworks';
import { getDefaultNetworkByChainId } from '../../../../util/networks';

interface DeFiProtocolPositionsListProps {
  defiPositions: { [key: Hex]: GroupedDeFiPositions } | null;
  //   refreshing: boolean;
  //   isAddTokenEnabled: boolean;
  //   onRefresh: () => void;
  //   showRemoveMenu: (arg: TokenI) => void;
  //   goToAddToken: () => void;
  //   showPercentageChange?: boolean;
  //   showNetworkBadge?: boolean;
}

export const DeFiProtocolPositionsList = ({
  defiPositions,
}: DeFiProtocolPositionsListProps) => {
  const { colors } = useTheme();
  // const privacyMode = useSelector(selectPrivacyMode);

  const styles = createStyles(colors);
  // const navigation = useNavigation();

  //   const handleLink = () => {
  //     navigation.navigate(Routes.SETTINGS_VIEW, {
  //       screen: Routes.ONBOARDING.GENERAL_SETTINGS,
  //     });
  //   };

  if (!defiPositions || Object.keys(defiPositions).length === 0) {
    return (
      <View style={styles.emptyView}>
        <View style={styles.emptyTokensView}>
          <Text style={styles.emptyTokensViewText}>
            {/* TODO: Custom message needed */}
            {strings('wallet.no_tokens')}
          </Text>
        </View>
      </View>
    );
  }

  const formattedDeFiPositions = Object.entries(defiPositions)
    .map(([chainId, chainDeFiPositions]) =>
      Object.values(chainDeFiPositions.protocols).map((protocol) => ({
        chainId,
        symbol: protocol.protocolDetails.name,
        ...protocol,
      })),
    )
    .flat();

  Logger.log('ASDKJHHDSJKL', formattedDeFiPositions);

  const networkBadgeSource = (currentChainId: Hex) => {
    const defaultNetwork = getDefaultNetworkByChainId(currentChainId) as
      | {
          imageSource: string;
        }
      | undefined;

    if (defaultNetwork) {
      return defaultNetwork.imageSource;
    }

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === currentChainId,
    );

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === currentChainId,
    );

    const network = unpopularNetwork || popularNetwork;
    if (network) {
      return network.rpcPrefs.imageSource;
    }

    const customNetworkImg = CustomNetworkImgMapping[currentChainId];
    if (customNetworkImg) {
      return customNetworkImg;
    }
  };

  return (
    <FlatList
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={formattedDeFiPositions}
      renderItem={({ item }) => (
        <AssetElement
          balance={formatWithThreshold(
            item.aggregatedMarketValue,
            0.01,
            I18n.locale,
            { style: 'currency', currency: 'USD' },
          )}
          asset={item}
        >
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkBadgeSource(toHex(item.chainId) as Hex)}
              />
            }
          >
            <AvatarToken
              name={item.symbol}
              imageSource={{ uri: item.protocolDetails.iconUrl }}
              size={AvatarSize.Md}
            />
          </BadgeWrapper>
          <View style={styles.balances}>
            <View style={styles.assetName}>
              <Text variant={TextVariant.BodyLGMedium}>
                {item.protocolDetails.name}
              </Text>
            </View>
          </View>
        </AssetElement>
        // <TokenListItem
        //   asset={item}
        //   showRemoveMenu={showRemoveMenu}
        //   showScamWarningModal={showScamWarningModal}
        //   setShowScamWarningModal={setShowScamWarningModal}
        //   privacyMode={privacyMode}
        //   showPercentageChange={showPercentageChange}
        //   showNetworkBadge={showNetworkBadge}
        // />
      )}
      keyExtractor={(_, index) => index.toString()}
    />
  );
};

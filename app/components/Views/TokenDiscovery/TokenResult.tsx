import React, { memo } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../../../util/theme';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useSelector } from 'react-redux';
import stylesheet from '../../UI/UrlAutocomplete/styles';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import AppConstants from '../../../core/AppConstants';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { addCurrencySymbol } from '../../../util/number';
import PercentageChange from '../../../component-library/components-temp/Price/PercentageChange';
import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';
import { isSwapsAllowed } from '../../UI/Swaps/utils';
import { NetworkBadgeSource } from '../../UI/AssetOverview/Balance/Balance';
import { Hex } from '@metamask/utils';

interface TokenResultProps {
    result: MoralisTokenResponseItem;
    onPress: () => void;
    onSwapPress: (result: MoralisTokenResponseItem) => void;
}

export const TokenResult: React.FC<TokenResultProps> = memo(({ result, onPress, onSwapPress }) => {
    const theme = useTheme();
    const styles = stylesheet({theme});
    const swapsEnabled = isSwapsAllowed(result.chain_id) && AppConstants.SWAPS.ACTIVE;
    const currentCurrency = useSelector(selectCurrentCurrency);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
      >
        <View style={styles.itemWrapper}>
          <BadgeWrapper
            badgeElement={(
              <Badge
                variant={BadgeVariant.Network}
                imageSource={NetworkBadgeSource(result.chain_id as Hex)}
              />
            )}
          >
            <AvatarToken
              imageSource={result.token_logo ? {uri: result.token_logo} : undefined}
              name={result.token_name}
            />
          </BadgeWrapper>
          <View style={styles.textContent}>
            <Text style={styles.name} numberOfLines={1}>
              {result.token_name}
            </Text>
            <Text style={styles.url} numberOfLines={1}>
              {result.token_symbol}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {addCurrencySymbol(result.price_usd, currentCurrency, true)}
            </Text>
            <PercentageChange value={result.price_percent_change_usd['1d'] ?? 0} />
          </View>
          <ButtonIcon
            style={{
              ...styles.resultActionButton,
              ...(swapsEnabled ? {} : styles.hiddenButton),
            }}
            iconName={IconName.SwapHorizontal}
            onPress={() => onSwapPress(result)}
            disabled={!swapsEnabled}
          />
        </View>
      </TouchableOpacity>
    );
});

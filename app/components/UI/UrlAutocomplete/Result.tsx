import React, { memo, useCallback } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../../../util/theme';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useDispatch, useSelector } from 'react-redux';
import { removeBookmark } from '../../../actions/bookmarks';
import stylesheet from './styles';
import { AutocompleteSearchResult, TokenSearchResult } from './types';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { selectSupportedSwapTokenAddressesForChainId } from '../../../selectors/tokenSearchDiscoveryDataController';
import { RootState } from '../../../reducers';
import { isSwapsAllowed } from '../Swaps/utils';
import AppConstants from '../../../core/AppConstants';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { addCurrencySymbol } from '../../../util/number';
import PercentageChange from '../../../component-library/components-temp/Price/PercentageChange';

interface ResultProps {
    result: AutocompleteSearchResult;
    onPress: () => void;
    onSwapPress: (result: TokenSearchResult) => void;
}

export const Result: React.FC<ResultProps> = memo(({ result, onPress, onSwapPress }) => {
    const theme = useTheme();
    const styles = stylesheet({theme});

    const name = typeof result.name === 'string' || result.type === 'tokens' ? result.name : getHost(result.url);

    const dispatch = useDispatch();

    const onPressRemove = useCallback(() => {
        dispatch(removeBookmark(result));
    }, [dispatch, result]);

    const swapTokenAddresses = useSelector((state: RootState) => selectSupportedSwapTokenAddressesForChainId(state, result.type === 'tokens' ? result.chainId : '0x'));

    const swapsEnabled = result.type === 'tokens' && isSwapsAllowed(result.chainId) && swapTokenAddresses?.includes(result.address) && AppConstants.SWAPS.ACTIVE;

    const currentCurrency = useSelector(selectCurrentCurrency);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
      >
        <View style={styles.itemWrapper}>
          {result.type === 'tokens' ? (
            <BadgeWrapper
              badgeElement={(
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={NetworkBadgeSource(result.chainId)}
                />
              )}
            >
              <AvatarToken
                imageSource={result.logoUrl ? {uri: result.logoUrl} : undefined}
                name={result.name}
              />
            </BadgeWrapper>
          ) : (
            <WebsiteIcon
              style={styles.bookmarkIco}
              url={result.url}
              title={name}
              textStyle={styles.fallbackTextStyle}
            />
          )}
          <View style={styles.textContent}>
            <Text style={styles.name} numberOfLines={1}>
              {result.name}
            </Text>
            <Text style={styles.url} numberOfLines={1}>
              {result.type === 'tokens' ? result.symbol : result.url}
            </Text>
          </View>
          {
            result.type === 'favorites' && (
              <ButtonIcon
                testID={deleteFavoriteTestId(result.url)}
                style={styles.resultActionButton}
                iconName={IconName.Trash}
                onPress={onPressRemove}
              />
            )
          }
          {
            result.type === 'tokens' && (
              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {addCurrencySymbol(result.price, currentCurrency, true)}
                </Text>
                <PercentageChange value={result.percentChange ?? 0} />
              </View>
            )
          }
          {
            result.type === 'tokens' && (
              <ButtonIcon
                style={{
                  ...styles.resultActionButton,
                  ...(swapsEnabled ? {} : styles.hiddenButton),
                }}
                iconName={IconName.SwapHorizontal}
                onPress={() => onSwapPress(result)}
                disabled={!swapsEnabled}
                testID="autocomplete-result-swap-button"
              />
            )
          }
        </View>
      </TouchableOpacity>
    );
});

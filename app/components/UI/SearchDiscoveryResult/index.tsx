import React, { memo, useCallback } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../../../util/theme';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';
import ButtonIcon, { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useDispatch, useSelector } from 'react-redux';
import { removeBookmark } from '../../../actions/bookmarks';
import stylesheet from './styles';
import { SearchDiscoveryCategory, SearchDiscoveryResultProps } from './types';
import BadgeWrapper, { BadgePosition } from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { isSwapsAllowed } from '../Swaps/utils';
import AppConstants from '../../../core/AppConstants';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { addCurrencySymbol } from '../../../util/number';
import PercentageChange from '../../../component-library/components-temp/Price/PercentageChange';
import { SwapBridgeNavigationLocation, useSwapBridgeNavigation } from '../Bridge/hooks/useSwapBridgeNavigation';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

export const SearchDiscoveryResult: React.FC<SearchDiscoveryResultProps> = memo(({ result, onSelect }) => {
    const theme = useTheme();
    const styles = stylesheet({theme});

    const name = typeof result.name === 'string' || result.category === SearchDiscoveryCategory.Tokens ? result.name : getHost(result.url);

    const dispatch = useDispatch();

    const onPressRemove = useCallback(() => {
        dispatch(removeBookmark(result));
    }, [dispatch, result]);

    const swapsEnabled = result.category === SearchDiscoveryCategory.Tokens && isSwapsAllowed(result.chainId) && AppConstants.SWAPS.ACTIVE;

    const currentCurrency = useSelector(selectCurrentCurrency);

    const { goToSwaps, networkModal } = useSwapBridgeNavigation({
        location: SwapBridgeNavigationLocation.TokenDetails,
        sourcePage: 'MainView',
        token: result.category === SearchDiscoveryCategory.Tokens ? result : undefined,
      });

    return (
      <>
        <TouchableOpacity
          style={styles.item}
          onPress={() => onSelect(result)}
        >
          <View style={styles.itemWrapper}>
            {result.category === SearchDiscoveryCategory.Tokens ? (
              <BadgeWrapper
                badgeElement={(
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={NetworkBadgeSource(result.chainId)}
                  />
                )}
                badgePosition={BadgePosition.BottomRight}
              >
                <AvatarToken
                  imageSource={result.logoUrl ? {uri: result.logoUrl} : undefined}
                  name={result.name}
                  size={AvatarSize.Lg}
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
                {result.category === SearchDiscoveryCategory.Tokens ? result.symbol : result.url}
              </Text>
            </View>
            {
              result.category === SearchDiscoveryCategory.Favorites && (
                <ButtonIcon
                  testID={deleteFavoriteTestId(result.url)}
                  style={styles.resultActionButton}
                  iconName={IconName.Close}
                  onPress={onPressRemove}
                  size={ButtonIconSizes.Md}
                />
              )
            }
            {
              result.category === SearchDiscoveryCategory.Tokens && (
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>
                    {addCurrencySymbol(result.price, currentCurrency, true)}
                  </Text>
                  <PercentageChange value={result.percentChange ?? 0} />
                </View>
              )
            }
            {
              result.category === SearchDiscoveryCategory.Tokens && (
                <ButtonIcon
                  style={{
                    ...styles.resultActionButton,
                    ...(swapsEnabled ? {} : styles.hiddenButton),
                  }}
                  size={ButtonIconSizes.Md}
                  iconName={IconName.SwapHorizontal}
                  onPress={() => goToSwaps()}
                  disabled={!swapsEnabled}
                  testID="autocomplete-result-swap-button"
                />
              )
            }
          </View>
        </TouchableOpacity>
        {networkModal}
      </>
    );
});

import React, { memo, useCallback } from 'react';
import { TouchableOpacity, View, Text, Image } from 'react-native';
import { useTheme } from '../../../util/theme';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { IconName as ComponentLibraryIconName } from '../../../component-library/components/Icons/Icon';
import { useDispatch, useSelector } from 'react-redux';
import { removeBookmark } from '../../../actions/bookmarks';
import stylesheet from './styles';
import {
  AutocompleteSearchResult,
  TokenSearchResult,
  UrlAutocompleteCategory,
  PredictionsSearchResult,
} from './types';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { addCurrencySymbol } from '../../../util/number';
import PercentageChange from '../../../component-library/components-temp/Price/PercentageChange';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import TrendingTokenLogo from '../Trending/components/TrendingTokenLogo';
import PerpsTokenLogo from '../Perps/components/PerpsTokenLogo';
import AppConstants from '../../../core/AppConstants';

interface ResultProps {
  result: AutocompleteSearchResult;
  onPress: () => void;
  onSwapPress: (result: TokenSearchResult) => void;
  navigation?: NavigationProp<ParamListBase>;
}

/**
 * Render icon for Predictions result
 */
const PredictionsIcon: React.FC<{
  result: PredictionsSearchResult;
  styles: ReturnType<typeof stylesheet>;
}> = memo(({ result, styles }) => {
  if (result.image) {
    return (
      <Image
        source={{ uri: result.image }}
        style={styles.bookmarkIco}
        resizeMode="cover"
      />
    );
  }
  return (
    <Box
      style={styles.bookmarkIco}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="bg-background-alternative"
    >
      <Icon name={IconName.Speedometer} size={IconSize.Md} />
    </Box>
  );
});

export const Result: React.FC<ResultProps> = memo(
  ({ result, onPress, onSwapPress }) => {
    const theme = useTheme();
    const styles = stylesheet({ theme });

    const dispatch = useDispatch();

    const onPressRemove = useCallback(() => {
      dispatch(removeBookmark(result));
    }, [dispatch, result]);

    const swapsEnabled =
      result.category === UrlAutocompleteCategory.Tokens &&
      AppConstants.SWAPS.ACTIVE;

    const currentCurrency = useSelector(selectCurrentCurrency);

    // Determine display name based on category
    const getDisplayName = () => {
      switch (result.category) {
        case UrlAutocompleteCategory.Tokens:
          return result.name;
        case UrlAutocompleteCategory.Perps:
          return result.name;
        case UrlAutocompleteCategory.Predictions:
          return result.title;
        default:
          return typeof result.name === 'string'
            ? result.name
            : getHost(result.url);
      }
    };

    // Determine subtitle based on category
    const getSubtitle = () => {
      switch (result.category) {
        case UrlAutocompleteCategory.Tokens:
          return result.symbol;
        case UrlAutocompleteCategory.Perps:
          return `${result.symbol} · ${result.maxLeverage}`;
        case UrlAutocompleteCategory.Predictions:
          return result.status === 'open' ? 'Open' : result.status;
        default:
          return result.url;
      }
    };

    // Render the appropriate icon
    const renderIcon = () => {
      switch (result.category) {
        case UrlAutocompleteCategory.Tokens:
          return (
            <BadgeWrapper
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={NetworkBadgeSource(result.chainId)}
                />
              }
            >
              <TrendingTokenLogo
                assetId={result.assetId}
                symbol={result.symbol}
                size={32}
              />
            </BadgeWrapper>
          );
        case UrlAutocompleteCategory.Perps:
          return <PerpsTokenLogo symbol={result.symbol} size={32} />;
        case UrlAutocompleteCategory.Predictions:
          return <PredictionsIcon result={result} styles={styles} />;
        default:
          return (
            <WebsiteIcon
              style={styles.bookmarkIco}
              url={result.url}
              title={getDisplayName()}
              textStyle={styles.fallbackTextStyle}
            />
          );
      }
    };

    // Render price/change info for tokens and perps
    const renderPriceInfo = () => {
      if (result.category === UrlAutocompleteCategory.Tokens) {
        return (
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {addCurrencySymbol(result.price, currentCurrency, true)}
            </Text>
            <PercentageChange value={result.percentChange ?? 0} />
          </View>
        );
      }

      if (result.category === UrlAutocompleteCategory.Perps) {
        // Parse the percentage change from the formatted string
        const percentStr = result.change24hPercent.replace(/[+%]/g, '');
        const percentValue = parseFloat(percentStr) || 0;
        return (
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{result.price}</Text>
            <PercentageChange value={percentValue} />
          </View>
        );
      }

      return null;
    };

    return (
      <TouchableOpacity style={styles.item} onPress={onPress}>
        <View style={styles.itemWrapper}>
          {renderIcon()}
          <View style={styles.textContent}>
            <Text style={styles.name} numberOfLines={1}>
              {getDisplayName()}
            </Text>
            <Text style={styles.url} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>
          {result.category === UrlAutocompleteCategory.Favorites && (
            <ButtonIcon
              testID={deleteFavoriteTestId(result.url)}
              style={styles.resultActionButton}
              iconName={ComponentLibraryIconName.Trash}
              onPress={onPressRemove}
            />
          )}
          {renderPriceInfo()}
          {result.category === UrlAutocompleteCategory.Tokens && (
            <ButtonIcon
              style={{
                ...styles.resultActionButton,
                ...(swapsEnabled ? {} : styles.hiddenButton),
              }}
              iconName={ComponentLibraryIconName.SwapHorizontal}
              onPress={() => onSwapPress(result)}
              disabled={!swapsEnabled}
              testID="autocomplete-result-swap-button"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  },
);

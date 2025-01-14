import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import CollectibleMedia from '../CollectibleMedia';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import { collectiblesSelector } from '../../../reducers/collectibles';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import { debounce } from 'lodash';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Theme } from '@metamask/design-tokens';
import { BrandColors } from '../../../util/theme/models';

const createStyles = (colors: Theme['colors'], brandColors: BrandColors) =>
  StyleSheet.create({
    itemWrapper: {
      paddingHorizontal: 15,
      paddingBottom: 16,
    },
    collectibleContractIcon: { width: 30, height: 30 },
    collectibleContractIconContainer: { marginHorizontal: 8, borderRadius: 30 },
    titleContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    verticalAlignedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleText: {
      fontSize: 18,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    collectibleIcon: {
      width: '100%',
      aspectRatio: 1,
    },
    collectibleInTheMiddle: {
      marginHorizontal: 8,
    },
    collectiblesRowContainer: {
      flex: 1,
      flexDirection: 'row',
      marginTop: 15,
    },
    collectibleBox: {
      flex: 1,
      flexDirection: 'row',
    },
    favoritesLogoWrapper: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: brandColors.yellow500,
    },
  });

const debouncedNavigation = debounce((navigation, collectible) => {
  navigation.navigate('NftDetails', { collectible });
}, 200);

interface ActionSheetType {
  show: () => void;
}

interface LongPressedCollectibleType {
  address: string;
  tokenId: string;
}

interface NftGridProps {
  navigation: NavigationProp<ParamListBase>;
  chainId: string;
  selectedAddress: string;
}

function NftGrid({ navigation, chainId, selectedAddress }: NftGridProps) {
  const collectibles = useSelector(collectiblesSelector);
  const actionSheetRef = useRef<ActionSheetType>(null);
  const longPressedCollectible = useRef<LongPressedCollectibleType | null>(
    null,
  );
  const { colors, themeAppearance, brandColors } = useTheme();
  const styles = createStyles(colors, brandColors);
  const { trackEvent, createEventBuilder } = useMetrics();

  const onLongPressCollectible = useCallback((collectible) => {
    actionSheetRef?.current?.show();
    longPressedCollectible.current = collectible;
  }, []);

  const removeNft = () => {
    const { NftController } = Engine.context;

    if (
      !longPressedCollectible?.current?.address &&
      !longPressedCollectible?.current?.tokenId
    ) {
      return null;
    }

    removeFavoriteCollectible(
      selectedAddress,
      chainId,
      longPressedCollectible.current,
    );
    NftController.removeAndIgnoreNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.COLLECTIBLE_REMOVED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
    Alert.alert(
      strings('wallet.collectible_removed_title'),
      strings('wallet.collectible_removed_desc'),
    );
  };

  const refreshMetadata = () => {
    const { NftController } = Engine.context;

    if (
      !longPressedCollectible?.current?.address &&
      !longPressedCollectible?.current?.tokenId
    ) {
      return null;
    }

    NftController.addNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
    );
  };

  const handleMenuAction = (index: number) => {
    if (index === 1) {
      removeNft();
    } else if (index === 0) {
      refreshMetadata();
    }
  };

  const onItemPress = useCallback(
    (collectible) => {
      debouncedNavigation(navigation, collectible);
    },
    [navigation],
  );

  return (
    <View style={styles.itemWrapper}>
      <ScrollView
        // eslint-disable-next-line react-native/no-inline-styles
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between', // Optional: Adjust spacing between items
        }}
      >
        {collectibles.map((collectible: Nft) => {
          if (!collectible) return null;
          return (
            <TouchableOpacity
              key={collectible.address}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                width: '30%',
                padding: 3,
                marginBottom: 10,
              }}
              onPress={() => onItemPress(collectible)}
              onLongPress={() => onLongPressCollectible(collectible)}
            >
              <CollectibleMedia
                style={styles.collectibleIcon}
                collectible={collectible}
                isTokenImage
              />
              <Text numberOfLines={1} ellipsizeMode="tail">
                {collectible.name}
              </Text>
              <Text numberOfLines={1} ellipsizeMode="tail">
                {collectible.collection?.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ActionSheet
        ref={actionSheetRef}
        title={strings('wallet.collectible_action_title')}
        options={[
          strings('wallet.refresh_metadata'),
          strings('wallet.remove'),
          strings('wallet.cancel'),
        ]}
        cancelButtonIndex={2}
        destructiveButtonIndex={1}
        // eslint-disable-next-line react/jsx-no-bind
        onPress={handleMenuAction}
        theme={themeAppearance}
      />
    </View>
  );
}

export default NftGrid;

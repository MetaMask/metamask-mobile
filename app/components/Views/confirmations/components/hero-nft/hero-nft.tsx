import { Nft } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import CollectibleMedia from '../../../../UI/CollectibleMedia';
import { useNft } from '../../hooks/nft/useNft';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import useNetworkInfo from '../../hooks/useNetworkInfo';
import { Hero } from '../UI/hero';
import styleSheet from './hero-nft.styles';
import { Text, TextVariant } from '@metamask/design-system-react-native';

const NftImageAndNetworkBadge = ({
  chainId,
  nft,
}: {
  chainId: string;
  nft?: Nft;
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { networkName, networkImage } = useNetworkInfo(chainId);

  const {
    image,
    tokenId,
    collection: { imageUrl } = { imageUrl: undefined },
  } = nft ?? { collection: { imageUrl: undefined } };
  const showPlaceholder = !nft || !chainId?.length || (!image && !imageUrl);

  const onPress = useCallback(() => {
    if (!nft) {
      return;
    }

    navigation.navigate('NftDetailsFullImage', {
      collectible: nft,
    });
  }, [navigation, nft]);

  if (showPlaceholder) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.touchableOpacity}
        testID="hero-nft-placeholder"
      >
        <View style={styles.noImagePlaceholder}>
          {tokenId && <Text>{`#${tokenId}`}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.touchableOpacity}>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            imageSource={networkImage}
            name={networkName}
            variant={BadgeVariant.Network}
            testID="hero-nft-badge-network"
          />
        }
      >
        <CollectibleMedia
          collectible={{ ...nft, image: image ?? imageUrl ?? '' }}
          style={styles.noImagePlaceholder}
        />
      </BadgeWrapper>
    </TouchableOpacity>
  );
};

const HeroNftHorizontal = () => {
  const { styles } = useStyles(styleSheet, { layout: 'horizontal' });
  const { chainId, name, nft } = useNft();
  const { tokenId } = nft ?? {};

  return (
    <View style={styles.horizontalContainer}>
      <View style={styles.textContainer}>
        <Text style={styles.label} variant={TextVariant.BodyMd}>
          {strings('confirm.label.sending')}
        </Text>
        <Text style={styles.nameText} variant={TextVariant.HeadingLg}>
          {name}
        </Text>
        {tokenId !== undefined && (
          <Text style={styles.tokenIdText} variant={TextVariant.BodyMd}>
            {`#${tokenId}`}
          </Text>
        )}
      </View>
      <View style={styles.iconContainer}>
        <NftImageAndNetworkBadge chainId={chainId} nft={nft} />
      </View>
    </View>
  );
};

interface HeroNftProps {
  layout?: 'default' | 'horizontal';
}

export const HeroNft = ({ layout = 'default' }: HeroNftProps) => {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { chainId, name, nft } = useNft();
  const { tokenId } = nft ?? {};

  if (layout === 'horizontal') {
    return <HeroNftHorizontal />;
  }

  return (
    <Hero
      componentAsset={<NftImageAndNetworkBadge chainId={chainId} nft={nft} />}
      hasPaddingTop={isFullScreenConfirmation}
      title={name}
      subtitle={tokenId === undefined ? '' : `#${tokenId}`}
    />
  );
};

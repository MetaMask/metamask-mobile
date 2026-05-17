import React from 'react';
import { Image } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import CardImage from '../../../components/CardImage';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import { CardStatus } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface CardImageSectionProps {
  isLoading: boolean;
  isCardDetailsLoading: boolean;
  cardDetailsImageUrl: string | null;
  isCardDetailsImageLoading: boolean;
  onImageLoad: () => void;
  onImageError: () => void;
  cardType: CardType | undefined;
  cardStatus: CardStatus | undefined;
  walletAddress: string | undefined;
}

const CardImageSection = ({
  isLoading,
  isCardDetailsLoading,
  cardDetailsImageUrl,
  isCardDetailsImageLoading,
  onImageLoad,
  onImageError,
  cardType,
  cardStatus,
  walletAddress,
}: CardImageSectionProps) => {
  const tw = useTailwind();

  if (isLoading || isCardDetailsLoading) {
    return (
      <Box
        twClassName="w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: 851 / 540 }}
      >
        <Skeleton
          height={'100%'}
          width={'100%'}
          style={tw.style('rounded-xl')}
          testID={
            isCardDetailsLoading
              ? CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON
              : undefined
          }
        />
      </Box>
    );
  }

  if (cardDetailsImageUrl) {
    return (
      <Box
        twClassName="w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: 851 / 540 }}
      >
        {isCardDetailsImageLoading && (
          <Skeleton
            height={'100%'}
            width={'100%'}
            style={tw.style('rounded-xl absolute inset-0 z-10')}
            testID={CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON}
          />
        )}
        <Image
          source={{ uri: cardDetailsImageUrl }}
          style={tw.style('w-full h-full')}
          resizeMode="cover"
          onLoad={onImageLoad}
          onError={onImageError}
          testID={CardHomeSelectors.CARD_DETAILS_IMAGE}
        />
      </Box>
    );
  }

  return (
    <CardImage
      type={cardType ?? CardType.VIRTUAL}
      status={cardStatus ?? CardStatus.ACTIVE}
      address={walletAddress}
      testID={walletAddress ? CardHomeSelectors.CARD_WALLET_ADDRESS : undefined}
    />
  );
};

export default CardImageSection;

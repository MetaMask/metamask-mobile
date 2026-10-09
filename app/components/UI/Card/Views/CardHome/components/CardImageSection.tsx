import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import CardImage from '../../../components/CardImage';
import CardSecureDetailsView from '../../../components/CardSecureDetailsView';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardSensitiveDetails,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface CardImageSectionProps {
  isLoading: boolean;
  isCardDetailsLoading: boolean;
  cardDetailsImageUrl: string | null;
  isCardDetailsImageLoading: boolean;
  onImageLoad: () => void;
  onImageError: () => void;
  cardType: CardType | undefined;
  cardStatus: CardStatus | undefined;
  cardSensitiveDetails?: CardSensitiveDetails | null;
  onCopyDetail?: (value: string) => void;
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
  cardSensitiveDetails,
  onCopyDetail,
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

  const secureDetails = (
    <CardSecureDetailsView
      cardDetailsImageUrl={cardDetailsImageUrl}
      isCardDetailsImageLoading={isCardDetailsImageLoading}
      onImageLoad={onImageLoad}
      onImageError={onImageError}
      cardSensitiveDetails={cardSensitiveDetails}
      onCopyDetail={onCopyDetail}
    />
  );

  if (cardSensitiveDetails || cardDetailsImageUrl) {
    return secureDetails;
  }

  return (
    <CardImage
      type={cardType ?? CardType.VIRTUAL}
      status={cardStatus ?? CardStatus.ACTIVE}
    />
  );
};

export default CardImageSection;

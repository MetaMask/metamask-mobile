import React from 'react';
import { Image, Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';
import CardImage from '../../../components/CardImage';
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
  walletAddress: string | undefined;
  cardSensitiveDetails?: CardSensitiveDetails | null;
  onCopyDetail?: (value: string) => void;
}

const formatPan = (pan: string): string =>
  pan
    .replace(/\s+/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatExpiry = (expiry: string): string => {
  const digits = expiry.replace(/\D/g, '');
  if (digits.length !== 6) return expiry;
  return `${digits.slice(4, 6)}/${digits.slice(2, 4)}`;
};

// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const CARD_DETAILS_ORANGE = '#FF5C16';

const DetailField = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}) => (
  <Box>
    <Text variant={TextVariant.BodyXs} twClassName="text-white opacity-70">
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      twClassName="text-white"
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

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

  if (cardSensitiveDetails) {
    return (
      <Box
        twClassName="w-full rounded-xl overflow-hidden"
        style={[
          { aspectRatio: 851 / 540 },
          { backgroundColor: CARD_DETAILS_ORANGE },
        ]}
        testID={CardHomeSelectors.CARD_SENSITIVE_DETAILS}
      >
        <Box twClassName="flex-1 p-5 justify-end gap-4">
          <Box twClassName="bg-white rounded-lg px-4 py-3">
            <Text
              variant={TextVariant.BodyXs}
              twClassName="text-black opacity-60"
            >
              {strings('card.card_home.card_details.card_number_label')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                twClassName="text-black"
                testID={CardHomeSelectors.CARD_SENSITIVE_DETAILS_PAN}
              >
                {formatPan(cardSensitiveDetails.pan)}
              </Text>
              <Pressable
                onPress={() => onCopyDetail?.(cardSensitiveDetails.pan)}
                hitSlop={8}
                testID={`${CardHomeSelectors.CARD_SENSITIVE_DETAILS_COPY}-${CardHomeSelectors.CARD_SENSITIVE_DETAILS_PAN}`}
              >
                <Icon
                  name={IconName.Copy}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              </Pressable>
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-4"
          >
            <DetailField
              label={strings('card.card_home.card_details.expiry_label')}
              value={formatExpiry(cardSensitiveDetails.expiry)}
              testID={CardHomeSelectors.CARD_SENSITIVE_DETAILS_EXPIRY}
            />
            <DetailField
              label={strings('card.card_home.card_details.cvv_label')}
              value={cardSensitiveDetails.cvv2}
              testID={CardHomeSelectors.CARD_SENSITIVE_DETAILS_CVV}
            />
            <Box twClassName="flex-1">
              <DetailField
                label={strings('card.card_home.card_details.name_label')}
                value={cardSensitiveDetails.embossedName}
                testID={CardHomeSelectors.CARD_SENSITIVE_DETAILS_NAME}
              />
            </Box>
          </Box>
        </Box>
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

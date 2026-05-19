import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyCondensedInfoCardsTestIds } from './MoneyCondensedInfoCards.testIds';
import howItWorksImage from '../../../../../images/mm_how_it_works.png';
import musdCoinImage from '../../../../../images/mm_usd.png';
import whatYouGetImage from '../../../../../images/mm_what_you_get.png';
import { Image, ImageProps } from 'expo-image';

interface MoneyCondensedInfoCardsProps {
  onHowItWorksPress?: () => void;
  onMusdPress?: () => void;
  onWhatYouGetPress?: () => void;
}

const CondensedCard = ({
  image,
  title,
  subtitle,
  onPress,
  testID,
}: {
  image: Pick<ImageProps, 'source' | 'style' | 'testID'>;
  title: string;
  subtitle: string;
  onPress?: () => void;
  testID: string;
}) => (
  <Pressable onPress={onPress} testID={testID}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="bg-muted rounded-xl p-4 gap-4"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="bg-muted rounded-xl size-[78px] justify-center"
      >
        {image?.source ? (
          <Image
            source={image.source}
            style={image.style}
            testID={image.testID}
          />
        ) : (
          <Icon
            name={IconName.Info}
            size={IconSize.Xl}
            color={IconColor.IconAlternative}
          />
        )}
      </Box>
      <Box twClassName="flex-1 gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {subtitle}
        </Text>
      </Box>
    </Box>
  </Pressable>
);

const MoneyCondensedInfoCards = ({
  onHowItWorksPress,
  onMusdPress,
  onWhatYouGetPress,
}: MoneyCondensedInfoCardsProps) => (
  <Box
    twClassName="px-4 py-3 gap-3"
    testID={MoneyCondensedInfoCardsTestIds.CONTAINER}
  >
    <CondensedCard
      image={{
        source: howItWorksImage,
        style: { height: 58, width: 58 },
        testID: MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_IMAGE,
      }}
      title={strings('money.condensed_cards.how_it_works_title')}
      subtitle={strings('money.condensed_cards.how_it_works_subtitle')}
      onPress={onHowItWorksPress}
      testID={MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD}
    />
    <CondensedCard
      image={{
        source: musdCoinImage,
        style: { height: 48, width: 48 },
        testID: MoneyCondensedInfoCardsTestIds.MUSD_IMAGE,
      }}
      title={strings('money.condensed_cards.musd_title')}
      subtitle={strings('money.condensed_cards.musd_subtitle')}
      onPress={onMusdPress}
      testID={MoneyCondensedInfoCardsTestIds.MUSD_CARD}
    />
    <CondensedCard
      image={{
        source: whatYouGetImage,
        style: { height: 66, width: 66 },
        testID: MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_IMAGE,
      }}
      title={strings('money.condensed_cards.what_you_get_title')}
      subtitle={strings('money.condensed_cards.what_you_get_subtitle')}
      onPress={onWhatYouGetPress}
      testID={MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD}
    />
  </Box>
);

export default MoneyCondensedInfoCards;

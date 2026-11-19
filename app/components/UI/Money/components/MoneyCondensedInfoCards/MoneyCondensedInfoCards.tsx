import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyCondensedInfoCardsTestIds } from './MoneyCondensedInfoCards.testIds';
import howItWorksImage from '../../../../../images/mm_how_it_works.png';
import musdCoinImage from '../../../../../images/mm_usd.png';
import whatYouGetImage from '../../../../../images/mm_what_you_get.png';
import { Image, ImageProps } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface MoneyCondensedInfoCardsProps {
  onHowItWorksPress?: () => void;
  onMusdPress?: () => void;
  onWhatYouGetPress?: () => void;
  /** Prototype: ignored; the cards are always solid background.section. */
  isGlass?: boolean;
}

const CondensedCard = ({
  image,
  title,
  onPress,
  testID,
}: {
  image: Pick<ImageProps, 'source' | 'style' | 'testID'>;
  title: string;
  onPress?: () => void;
  testID: string;
}) => {
  const tw = useTailwind();

  const content = (
    <>
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
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
      </Box>
    </>
  );

  return (
    // Prototype: solid background.section card with 1px border.muted (no glass).
    // p-[15px] + 1px border keeps the previous p-4 footprint.
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center gap-4 rounded-xl border border-muted bg-section p-[15px]',
          pressed && 'opacity-70',
        )
      }
    >
      {content}
    </Pressable>
  );
};

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
      onPress={onWhatYouGetPress}
      testID={MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD}
    />
  </Box>
);

export default MoneyCondensedInfoCards;

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

interface MoneyCondensedInfoCardsProps {
  onHowItWorksPress?: () => void;
  onMusdPress?: () => void;
  onWhatYouGetPress?: () => void;
}

const CondensedCard = ({
  iconName,
  title,
  subtitle,
  onPress,
  testID,
}: {
  iconName: IconName;
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
        <Icon
          name={iconName}
          size={IconSize.Xl}
          color={IconColor.IconAlternative}
        />
      </Box>
      <Box twClassName="flex-1 gap-1">
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
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
      iconName={IconName.Stake}
      title={strings('money.condensed_cards.how_it_works_title')}
      subtitle={strings('money.condensed_cards.how_it_works_subtitle')}
      onPress={onHowItWorksPress}
      testID={MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD}
    />
    <CondensedCard
      iconName={IconName.Coin}
      title={strings('money.condensed_cards.musd_title')}
      subtitle={strings('money.condensed_cards.musd_subtitle')}
      onPress={onMusdPress}
      testID={MoneyCondensedInfoCardsTestIds.MUSD_CARD}
    />
    <CondensedCard
      iconName={IconName.SwapHorizontal}
      title={strings('money.condensed_cards.what_you_get_title')}
      subtitle={strings('money.condensed_cards.what_you_get_subtitle')}
      onPress={onWhatYouGetPress}
      testID={MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD}
    />
  </Box>
);

export default MoneyCondensedInfoCards;

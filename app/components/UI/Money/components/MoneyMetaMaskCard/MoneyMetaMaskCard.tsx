import React, { useCallback } from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import styles from './MoneyMetaMaskCard.styles';

import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

interface MoneyMetaMaskCardProps {
  onGetNowPress?: (cardType: string) => void;
  onHeaderPress?: () => void;
}

const CardRow = ({
  imageSource,
  cardName,
  cashbackPercentage,
  onPress,
  testID,
}: {
  imageSource: ImageSourcePropType;
  cardName: string;
  cashbackPercentage: string;
  onPress: () => void;
  testID: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    alignItems={BoxAlignItems.Center}
    testID={testID}
    twClassName="py-3"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-4"
    >
      <Image source={imageSource} style={styles.cardImage} />
      <Box twClassName="gap-2">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {cardName}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          color={TextColor.SuccessDefault}
        >
          {strings('money.metamask_card.cashback', {
            percentage: cashbackPercentage,
          })}
        </Text>
      </Box>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onPress}
      twClassName="self-center"
    >
      {strings('money.metamask_card.get_now')}
    </Button>
  </Box>
);

const MoneyMetaMaskCard = ({
  onGetNowPress = () => undefined,
  onHeaderPress,
}: MoneyMetaMaskCardProps) => {
  const handleVirtualPress = useCallback(
    () => onGetNowPress('virtual'),
    [onGetNowPress],
  );
  const handleMetalPress = useCallback(
    () => onGetNowPress('metal'),
    [onGetNowPress],
  );

  return (
    <Box
      twClassName="px-4 py-3 gap-3"
      testID={MoneyMetaMaskCardTestIds.CONTAINER}
    >
      <MoneySectionHeader
        title={strings('money.metamask_card.title')}
        onPress={onHeaderPress}
      />

      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextAlternative}
      >
        {strings('money.metamask_card.subtitle')}
      </Text>

      <CardRow
        imageSource={mmCardRegular}
        cardName={strings('money.metamask_card.virtual_card')}
        cashbackPercentage="1"
        onPress={handleVirtualPress}
        testID={MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW}
      />

      <CardRow
        imageSource={mmCardMetal}
        cardName={strings('money.metamask_card.metal_card')}
        cashbackPercentage="3"
        onPress={handleMetalPress}
        testID={MoneyMetaMaskCardTestIds.METAL_CARD_ROW}
      />
    </Box>
  );
};

export default MoneyMetaMaskCard;

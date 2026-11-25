import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface MoneyHeroIdentityHeaderProps {
  title: string;
  offerEndsIn: string | null;
  offerEndsTestID: string;
  titleRowClassName: string;
}

/**
 * Title and optional offer-end line. The row under it stays with the card: a
 * referred-by code, or the referrer's own code and share button.
 */
const MoneyHeroIdentityHeader: React.FC<MoneyHeroIdentityHeaderProps> = ({
  title,
  offerEndsIn,
  offerEndsTestID,
  titleRowClassName,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName={titleRowClassName}
  >
    <Box twClassName="flex-1 pr-2">
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {title}
      </Text>
      {offerEndsIn ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={offerEndsTestID}
        >
          {offerEndsIn}
        </Text>
      ) : null}
    </Box>
  </Box>
);

export default MoneyHeroIdentityHeader;

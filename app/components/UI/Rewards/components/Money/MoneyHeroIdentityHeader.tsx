import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';

export interface MoneyHeroIdentityHeaderProps {
  title: string;
  offerEndsIn: string | null;
  offerEndsTestID: string;
  termsTitle: string | undefined;
  termsTestID: string;
  titleRowClassName: string;
}

/**
 * Title, optional offer-end line, and the info button that opens the terms
 * sheet. The row under it stays with the card: a referred-by code, or the
 * referrer's own code and share button.
 */
const MoneyHeroIdentityHeader: React.FC<MoneyHeroIdentityHeaderProps> = ({
  title,
  offerEndsIn,
  offerEndsTestID,
  termsTitle,
  termsTestID,
  titleRowClassName,
}) => {
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
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
      <ButtonIcon
        iconName={IconName.Info}
        size={ButtonIconSize.Md}
        iconProps={{ color: IconColor.IconAlternative, size: IconSize.Md }}
        twClassName="-mr-1.5"
        onPress={() =>
          navigation.navigate(Routes.MODAL.REWARDS_MONEY_TERMS_SHEET)
        }
        accessibilityLabel={termsTitle}
        testID={termsTestID}
      />
    </Box>
  );
};

export default MoneyHeroIdentityHeader;

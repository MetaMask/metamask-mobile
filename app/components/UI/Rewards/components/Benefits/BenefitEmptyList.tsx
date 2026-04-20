import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import EmptyStateIconLight from 'images/benefits/empty-state-icon-light.svg';
import EmptyStateIconDark from 'images/benefits/empty-state-icon-dark.svg';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const BenefitEmptyList = () => {
  const { themeAppearance } = useTheme();

  const displayIcon = useMemo(() => {
    if (themeAppearance === 'dark') {
      return (
        <EmptyStateIconDark
          name="EmptyStateIconDark"
          width={72}
          height={72}
          testID={REWARDS_VIEW_SELECTORS.BENEFIT_EMPTY_DARK_ICON}
        />
      );
    }
    return (
      <EmptyStateIconLight
        name="EmptyStateIcon"
        width={72}
        height={72}
        testID={REWARDS_VIEW_SELECTORS.BENEFIT_EMPTY_LIGHT_ICON}
      />
    );
  }, [themeAppearance]);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="py-6 gap-3"
    >
      {displayIcon}
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('rewards.benefits.empty-list')}
      </Text>
    </Box>
  );
};

export default BenefitEmptyList;

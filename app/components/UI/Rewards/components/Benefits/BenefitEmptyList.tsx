import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import EmptyStateIconLight from 'images/benefits/empty-state-icon-light.svg';
import EmptyStateIconDark from 'images/benefits/empty-state-icon-dark.svg';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';

const BenefitEmptyList = () => {
  const { themeAppearance } = useTheme();

  const displayIcon = useMemo(() => {
    if (themeAppearance === 'dark') {
      return (
        <EmptyStateIconDark name="EmptyStateIconDark" width={72} height={72} />
      );
    }
    return <EmptyStateIconLight name="EmptyStateIcon" width={72} height={72} />;
  }, [themeAppearance]);

  return (
    <Box twClassName="flex-1 gap-3 items-center justify-center">
      {displayIcon}
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-alternative w-[220px] text-center"
      >
        {strings('rewards.benefits.empty-list')}
      </Text>
    </Box>
  );
};

export default BenefitEmptyList;

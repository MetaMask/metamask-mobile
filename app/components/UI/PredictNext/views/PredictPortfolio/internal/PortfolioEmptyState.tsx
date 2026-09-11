import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import PredictionsEmptyDarkIcon from '../../../../../../images/predictions-dark.svg';
import PredictionsEmptyLightIcon from '../../../../../../images/predictions-light.svg';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';

interface PortfolioEmptyStateProps {
  onBrowseMarkets: () => void;
}

export const PortfolioEmptyState = ({
  onBrowseMarkets,
}: PortfolioEmptyStateProps) => {
  const theme = useDesignSystemTheme();
  const EmptyIcon =
    theme === Theme.Dark ? PredictionsEmptyDarkIcon : PredictionsEmptyLightIcon;

  return (
    <Box
      twClassName="flex-1 items-center justify-center px-8 py-10"
      testID={PredictPortfolioScreenTestIds.EMPTY_STATE}
    >
      <Box twClassName="mb-4 h-[72px] w-[72px] items-center justify-center">
        <EmptyIcon name="predict-next-portfolio-empty" width={72} height={72} />
      </Box>
      <Text variant={TextVariant.HeadingSm} twClassName="mb-2 text-center">
        {strings('predict_next.portfolio.empty.title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-4 max-w-[220px] text-center"
      >
        {strings('predict_next.portfolio.empty.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={onBrowseMarkets}
        testID={PredictPortfolioScreenTestIds.BROWSE_MARKETS}
        twClassName="self-center"
      >
        {strings('predict_next.portfolio.empty.browse_markets')}
      </Button>
    </Box>
  );
};

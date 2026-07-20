import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import {
  Theme,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import WatchlistEmptyDarkIcon from '../../../../../../images/watchlist-empty-dark.svg';
import WatchlistEmptyLightIcon from '../../../../../../images/watchlist-empty-light.svg';

const WatchlistEmptyState: React.FC = () => {
  const designSystemTheme = useDesignSystemTheme();
  const EmptyIcon =
    designSystemTheme === Theme.Dark
      ? WatchlistEmptyDarkIcon
      : WatchlistEmptyLightIcon;

  return (
    <Box alignItems={BoxAlignItems.Center} gap={2} padding={4}>
      <EmptyIcon
        name="watchlist-empty"
        width={72}
        height={78}
        testID="watchlist-empty-icon"
      />
      <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
        {strings('token_watchlist.home_empty_title')}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('token_watchlist.home_empty_subtitle')}
      </Text>
    </Box>
  );
};

export default WatchlistEmptyState;

import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

interface WatchlistErrorRowProps {
  onRetry?: () => void;
}

const WatchlistErrorRow = ({ onRetry }: WatchlistErrorRowProps) => {
  const message = strings('token_watchlist.load_error');

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="justify-between px-4 py-3"
      testID="watchlist-error-row"
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        accessibilityRole="alert"
      >
        {message}
      </Text>
      {onRetry ? (
        <ButtonBase size={ButtonBaseSize.Sm} onPress={onRetry}>
          {strings('token_watchlist.retry')}
        </ButtonBase>
      ) : null}
    </Box>
  );
};

export default WatchlistErrorRow;

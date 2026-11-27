import React, { useCallback, useEffect } from 'react';
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
import { WatchlistErrorRowTestIds } from './WatchlistErrorRow.testIds';

interface WatchlistErrorRowProps {
  onRetry?: () => void;
  message?: string;
  testID?: string;
  twClassName?: string;
}

const WatchlistErrorRow = ({
  onRetry,
  message = strings('token_watchlist.load_error'),
  testID = WatchlistErrorRowTestIds.ROW,
  twClassName,
}: WatchlistErrorRowProps): React.JSX.Element => {
  const handleRetry = useCallback((): void => {
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={['justify-between py-3', twClassName]
        .filter(Boolean)
        .join(' ')}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        accessibilityRole="alert"
      >
        {message}
      </Text>
      {onRetry ? (
        <ButtonBase size={ButtonBaseSize.Sm} onPress={handleRetry}>
          {strings('token_watchlist.retry')}
        </ButtonBase>
      ) : null}
    </Box>
  );
};

export default WatchlistErrorRow;

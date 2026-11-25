import React, { type ComponentProps } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  ListItem,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import type { UnifiedWatchlistUnavailablePerp } from './types';

export const getUnavailablePerpRowTestId = (symbol: string) =>
  `watchlist-unavailable-perp-${symbol}`;
export const getUnavailablePerpRemoveButtonTestId = (symbol: string) =>
  `${getUnavailablePerpRowTestId(symbol)}-remove`;

interface WatchlistUnavailablePerpRowProps {
  item: UnifiedWatchlistUnavailablePerp;
  onRemove: () => void;
  onLongPress?: () => void;
  showRemoveAction?: boolean;
  twClassName?: string;
  accessibilityActions?: ComponentProps<
    typeof ListItem
  >['accessibilityActions'];
  onAccessibilityAction?: ComponentProps<
    typeof ListItem
  >['onAccessibilityAction'];
}

const WatchlistUnavailablePerpRow = ({
  item,
  onRemove,
  onLongPress,
  showRemoveAction = true,
  twClassName,
  accessibilityActions,
  onAccessibilityAction,
}: WatchlistUnavailablePerpRowProps) => (
  <ListItem
    isInteractive
    title={item.symbol}
    description={strings('token_watchlist.market_data_unavailable')}
    onLongPress={onLongPress}
    accessibilityActions={accessibilityActions}
    onAccessibilityAction={onAccessibilityAction}
    testID={getUnavailablePerpRowTestId(item.symbol)}
    endAccessory={
      showRemoveAction ? (
        <ButtonIcon
          iconName={IconName.StarFilled}
          size={ButtonIconSize.Md}
          onPress={onRemove}
          testID={getUnavailablePerpRemoveButtonTestId(item.symbol)}
          accessibilityLabel={strings(
            'perps.market_details.remove_from_watchlist',
          )}
        />
      ) : undefined
    }
    twClassName={['py-2 min-h-0', twClassName].filter(Boolean).join(' ')}
  />
);

export default React.memo(WatchlistUnavailablePerpRow);

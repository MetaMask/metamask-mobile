import React, { type ComponentProps } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  ListItem,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import type { UnifiedWatchlistUnavailablePerp } from './types';

interface WatchlistUnavailablePerpRowProps {
  item: UnifiedWatchlistUnavailablePerp;
  onRemove: () => void;
  onLongPress?: () => void;
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
  twClassName,
  accessibilityActions,
  onAccessibilityAction,
}: WatchlistUnavailablePerpRowProps) => (
  <ListItem
    isInteractive={Boolean(onLongPress)}
    title={item.symbol}
    description={strings('token_watchlist.market_data_unavailable')}
    onLongPress={onLongPress}
    accessibilityActions={accessibilityActions}
    onAccessibilityAction={onAccessibilityAction}
    endAccessory={
      <ButtonIcon
        iconName={IconName.StarFilled}
        size={ButtonIconSize.Md}
        onPress={onRemove}
        accessibilityLabel={strings(
          'perps.market_details.remove_from_watchlist',
        )}
      />
    }
    twClassName={twClassName}
  />
);

export default React.memo(WatchlistUnavailablePerpRow);

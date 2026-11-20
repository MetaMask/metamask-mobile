import React from 'react';
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
  twClassName?: string;
}

const WatchlistUnavailablePerpRow = ({
  item,
  onRemove,
  twClassName,
}: WatchlistUnavailablePerpRowProps) => (
  <ListItem
    title={item.symbol}
    description={strings('token_watchlist.market_data_unavailable')}
    testID={getUnavailablePerpRowTestId(item.symbol)}
    endAccessory={
      <ButtonIcon
        iconName={IconName.StarFilled}
        size={ButtonIconSize.Md}
        onPress={onRemove}
        testID={getUnavailablePerpRemoveButtonTestId(item.symbol)}
        accessibilityLabel={strings(
          'perps.market_details.remove_from_watchlist',
        )}
      />
    }
    twClassName={twClassName}
  />
);

export default React.memo(WatchlistUnavailablePerpRow);

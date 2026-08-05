import { TabEmptyState } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../../../util/theme';
import emptyStatePerpsLight from '../../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../../images/empty-state-perps-dark.png';

interface PerpsProOrdersEmptyStateProps {
  /** When set, shows the ticker-filtered empty copy instead of the global one. */
  filteredTicker?: string;
}

/**
 * Empty state shown in the Pro-mode Orders tab when the user has no open
 * orders (or none matching the active ticker filter).
 */
const PerpsProOrdersEmptyState = ({
  filteredTicker,
}: PerpsProOrdersEmptyStateProps) => {
  const tw = useTailwind();
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );

  const description = filteredTicker
    ? strings('perps.pro_positions_panel.orders_empty_filtered', {
        ticker: filteredTicker,
      })
    : strings('perps.pro_positions_panel.orders_empty');

  return (
    <TabEmptyState
      icon={
        <Image
          source={perpsImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
      }
      description={description}
    />
  );
};

export default PerpsProOrdersEmptyState;

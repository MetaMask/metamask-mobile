import { TabEmptyState } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../../../util/theme';
import emptyStatePerpsLight from '../../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../../images/empty-state-perps-dark.png';

interface PerpsProPositionsEmptyStateProps {
  /** When set, shows the ticker-filtered empty copy instead of the global one. */
  filteredTicker?: string;
  /** When set, shows side-filtered empty copy instead of the global one. */
  filteredSideDescriptionKey?: string;
}

/**
 * Empty state shown in the Pro-mode Positions tab when the user has no open
 * positions (or none matching the active filter).
 */
const PerpsProPositionsEmptyState = ({
  filteredTicker,
  filteredSideDescriptionKey,
}: PerpsProPositionsEmptyStateProps) => {
  const tw = useTailwind();
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );

  const description = filteredSideDescriptionKey
    ? strings(filteredSideDescriptionKey)
    : filteredTicker
      ? strings('perps.pro_positions_panel.positions_empty_filtered', {
          ticker: filteredTicker,
        })
      : strings('perps.pro_positions_panel.positions_empty');

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

export default PerpsProPositionsEmptyState;

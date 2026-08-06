import { TabEmptyState } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../../../util/theme';
import emptyStatePerpsLight from '../../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../../images/empty-state-perps-dark.png';

export interface PerpsProTabEmptyStateProps {
  /** When set, shows the ticker-filtered empty copy instead of the global one. */
  filteredTicker?: string;
  /** When set, shows side-filtered empty copy instead of the global one. */
  filteredSideDescriptionKey?: string;
  /** i18n key for the unfiltered empty description. */
  emptyDescriptionKey: string;
  /** i18n key for the ticker-filtered empty description. */
  filteredTickerDescriptionKey: string;
}

/**
 * Shared Perps Pro tab empty state with optional ticker/side-filter copy.
 */
const PerpsProTabEmptyState = ({
  filteredTicker,
  filteredSideDescriptionKey,
  emptyDescriptionKey,
  filteredTickerDescriptionKey,
}: PerpsProTabEmptyStateProps) => {
  const tw = useTailwind();
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );

  const description = filteredSideDescriptionKey
    ? strings(filteredSideDescriptionKey)
    : filteredTicker
      ? strings(filteredTickerDescriptionKey, {
          ticker: filteredTicker,
        })
      : strings(emptyDescriptionKey);

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

export default PerpsProTabEmptyState;

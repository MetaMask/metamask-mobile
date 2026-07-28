import { TabEmptyState } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../../../util/theme';
import emptyStatePerpsLight from '../../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../../images/empty-state-perps-dark.png';

/**
 * Empty state shown in the Pro-mode Orders tab when the user has no open
 * orders. Renders the themed Perps candlestick illustration with a message.
 */
const PerpsProOrdersEmptyState = () => {
  const tw = useTailwind();
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );

  return (
    <TabEmptyState
      icon={
        <Image
          source={perpsImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
      }
      description={strings('perps.pro_positions_panel.orders_empty')}
    />
  );
};

export default PerpsProOrdersEmptyState;

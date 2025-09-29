import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../../../component-library/components-temp/TabEmptyState';
import { useAssetFromTheme } from '../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import emptyStatePerpsLight from '../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../images/empty-state-perps-dark.png';

export interface PerpsEmptyStateProps extends TabEmptyStateProps {
  onStartTrading: () => void;
  testID?: string;
}

export const PerpsEmptyState: React.FC<PerpsEmptyStateProps> = ({
  onStartTrading,
  testID,
  ...props
}) => {
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );
  const tw = useTailwind();
  return (
    <TabEmptyState
      icon={
        <Image
          source={perpsImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
      }
      description={strings('perps.position.list.first_time_description')}
      actionButtonText={strings('perps.position.list.start_trading')}
      onAction={onStartTrading}
      testID={testID}
      {...props}
    />
  );
};

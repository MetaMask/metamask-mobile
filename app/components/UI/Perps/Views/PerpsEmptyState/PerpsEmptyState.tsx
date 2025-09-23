import React from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { TabEmptyState } from '../../../../../component-library/components-temp/TabEmptyState';
import { useAssetFromTheme } from '../../../../../util/theme';
import emptyStatePerpsLight from '../../../../../images/empty-state-perps-light.png';
import emptyStatePerpsDark from '../../../../../images/empty-state-perps-dark.png';

export interface PerpsEmptyStateProps {
  onStartTrading: () => void;
  testID?: string;
}

export const PerpsEmptyState: React.FC<PerpsEmptyStateProps> = ({
  onStartTrading,
  testID,
}) => {
  const perpsImage = useAssetFromTheme(
    emptyStatePerpsLight,
    emptyStatePerpsDark,
  );
  return (
    <TabEmptyState
      icon={<Image source={perpsImage} resizeMode="contain" />}
      description={strings('perps.position.list.first_time_description')}
      actionButtonText={strings('perps.position.list.start_trading')}
      onAction={onStartTrading}
      testID={testID}
    />
  );
};

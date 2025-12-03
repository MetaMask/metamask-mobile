import { RefreshControl } from 'react-native';
import React from 'react';

import { useTheme } from '../../../util/theme';
import { useNftRefresh } from './useNftRefresh';

const NftGridRefreshControl = React.forwardRef<RefreshControl>((props, ref) => {
  const { colors } = useTheme();
  const { refreshing, onRefresh } = useNftRefresh();

  return (
    <RefreshControl
      ref={ref}
      colors={[colors.primary.default]}
      tintColor={colors.icon.default}
      refreshing={refreshing}
      onRefresh={onRefresh}
      {...props}
    />
  );
});

export default NftGridRefreshControl;

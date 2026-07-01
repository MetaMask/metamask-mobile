import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import {
  AvatarGroup,
  AvatarGroupVariant,
  AvatarGroupSize,
} from '@metamask/design-system-react-native';
import { RootState } from '../../../reducers';
import { useStyles } from '../../../component-library/hooks';
import { getActiveNetworksByScopes } from '../../../selectors/multichainNetworkController';
import styleSheet from './AccountNetworkIndicator.styles';
import { getNetworkImageSource } from '../../../util/networks';

const AccountNetworkIndicator = ({
  partialAccount,
}: {
  partialAccount: { address: string; scopes: CaipChainId[] };
}) => {
  const { styles } = useStyles(styleSheet, {});
  const networksWithTransactionActivity = useSelector((state: RootState) =>
    getActiveNetworksByScopes(state, partialAccount),
  );
  const networkAvatarPropsArr = useMemo(
    () =>
      networksWithTransactionActivity.map((networkInfo, index) => ({
        src: getNetworkImageSource({
          chainId: networkInfo.caipChainId,
        }),
        testID: `avatar-group-${index}`,
      })),
    [networksWithTransactionActivity],
  );

  return (
    <View style={styles.networkTokensContainer} testID="network-container">
      <AvatarGroup
        variant={AvatarGroupVariant.Network}
        size={AvatarGroupSize.Xs}
        max={4}
        avatarPropsArr={networkAvatarPropsArr}
      />
    </View>
  );
};

export default AccountNetworkIndicator;

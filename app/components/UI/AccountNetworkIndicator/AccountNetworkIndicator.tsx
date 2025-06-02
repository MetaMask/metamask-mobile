import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { RootState } from '../../../reducers';
import { useStyles } from '../../../component-library/hooks';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar';
import { getActiveNetworksByScopes } from '../../../selectors/multichainNetworkController';
import styleSheet from './AccountNetworkIndicator.styles';

const AccountNetworkIndicator = ({
  partialAccount,
}: {
  partialAccount: { address: string; scopes: CaipChainId[] };
}) => {
  const { styles } = useStyles(styleSheet, {});
  const networksWithTransactionActivity = useSelector((state: RootState) =>
    getActiveNetworksByScopes(state, partialAccount),
  );

  return (
    <View style={styles.networkTokensContainer}>
      <AvatarGroup
        avatarPropsList={networksWithTransactionActivity
          .slice()
          .reverse()
          .map((networkInfo, index) => ({
            ...networkInfo,
            variant: AvatarVariant.Network,
            imageSource: networkInfo.imageSource,
            testID: `avatar-group-${index}`,
          }))}
        maxStackedAvatars={4}
        renderOverflowCounter={false}
      />
    </View>
  );
};

export default AccountNetworkIndicator;

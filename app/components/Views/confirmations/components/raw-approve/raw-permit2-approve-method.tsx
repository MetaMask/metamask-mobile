import { View, Text } from 'react-native';

import { TokenStandard } from '../../types/token';
import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';

// Revoke possible
// ERC20
export const RawPermit2ApproveMethod = () => {
  const { tokenStandard, isRevoke } = useApproveTransactionData();

  if (tokenStandard !== TokenStandard.ERC20) {
    return null;
  }

  if (isRevoke) {
    return (
      <View>
        <Text>Revoke - RawPermit2ApproveMethod</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>RawPermit2ApproveMethod</Text>
    </View>
  );
};

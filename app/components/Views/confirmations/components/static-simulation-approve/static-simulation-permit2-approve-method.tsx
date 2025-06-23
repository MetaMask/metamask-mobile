import { View, Text } from 'react-native';

import { TokenStandard } from '../../types/token';
import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';

// Revoke possible
// ERC20
export const StaticSimulationPermit2ApproveMethod = () => {
  const { tokenStandard, isRevoke } = useApproveTransactionData();

  if (tokenStandard !== TokenStandard.ERC20) {
    return null;
  }

  if (isRevoke) {
    return (
      <View>
        <Text>Revoke - StaticSimulationPermit2ApproveMethod</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>StaticSimulationPermit2ApproveMethod</Text>
    </View>
  );
};

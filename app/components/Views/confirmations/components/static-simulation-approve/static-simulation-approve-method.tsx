import { View, Text } from 'react-native';

import { TokenStandard } from '../../types/token';
import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';

// Revoke possible
// ERC20 - ERC721
export const StaticSimulationApproveMethod = () => {
  const { tokenStandard, isRevoke } = useApproveTransactionData();

  if (
    tokenStandard !== TokenStandard.ERC20 &&
    tokenStandard !== TokenStandard.ERC721
  ) {
    return null;
  }

  if (isRevoke) {
    return (
      <View>
        <Text>Revoke - StaticSimulationApproveMethod</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>StaticSimulationApproveMethod</Text>
    </View>
  );
};

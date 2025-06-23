import { View, Text } from 'react-native';

import { TokenStandard } from '../../types/token';
import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';

// Revoke possible
// ERC721 - ERC1155
export const StaticSimulationSetApprovalForAllMethod = () => {
  const { tokenStandard, isRevoke } = useApproveTransactionData();

  if (
    tokenStandard !== TokenStandard.ERC721 &&
    tokenStandard !== TokenStandard.ERC1155
  ) {
    return null;
  }

  if (isRevoke) {
    return (
      <View>
        <Text>Revoke - StaticSimulationSetApprovalForAllMethod</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>StaticSimulationSetApprovalForAllMethod</Text>
    </View>
  );
};

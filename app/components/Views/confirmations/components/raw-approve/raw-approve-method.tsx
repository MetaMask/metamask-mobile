import { View, Text } from 'react-native';

import { TokenStandard } from '../../types/token';
import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';

// Revoke possible
// ERC20 - ERC721
export const RawApproveMethod = () => {
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
        <Text>Revoke - RawApproveMethod</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>RawApproveMethod</Text>
    </View>
  );
};

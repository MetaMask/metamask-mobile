import { View, Text } from 'react-native';

import { TokenStandard } from '../../types/token';
import { useApproveTransactionData } from '../../hooks/useApproveTransactionData';

// No revoke
// ERC20
export const RawDecreaseAllowanceMethod = () => {
  const { tokenStandard } = useApproveTransactionData();

  if (tokenStandard !== TokenStandard.ERC20) {
    return null;
  }

  return (
    <View>
      <Text>RawDecreaseAllowanceMethod</Text>
    </View>
  );
};

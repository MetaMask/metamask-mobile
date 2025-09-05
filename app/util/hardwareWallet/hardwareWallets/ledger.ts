import { getDeviceId } from '../../../core/Ledger/Ledger';
import type { StackScreenProps } from '@react-navigation/stack';
import type { NavigatableRootParamList } from '../../navigation';

type LedgerSignModalProps = StackScreenProps<
  NavigatableRootParamList,
  'LedgerMessageSignModal'
>;

export const signModalNavDetail = async (
  params: LedgerSignModalProps['route']['params'],
) => {
  const deviceId = await getDeviceId();
  return ['LedgerMessageSignModal', { ...params, deviceId }];
};

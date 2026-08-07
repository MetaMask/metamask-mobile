import { useSelector } from 'react-redux';

import { type AccountAvatarVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../../selectors/settings';

export function useAccountAvatarType(): AccountAvatarVariant {
  return useSelector(selectAvatarAccountType);
}

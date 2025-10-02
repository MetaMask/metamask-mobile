import { useSelector } from 'react-redux';

import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { selectAvatarAccountType } from '../../../../selectors/settings';

export function useAccountAvatarType(): AvatarAccountType {
  return useSelector(selectAvatarAccountType);
}

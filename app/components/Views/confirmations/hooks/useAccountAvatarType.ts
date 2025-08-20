import { useSelector, shallowEqual } from 'react-redux';

import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { RootState } from '../../../../reducers';

export function useAccountAvatarType(): AvatarAccountType {
  return useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );
}

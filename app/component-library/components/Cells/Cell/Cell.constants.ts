import { AvatarProps, AvatarVariants } from '../../Avatars/Avatar/Avatar.types';
import { AvatarAccountType } from '../../Avatars/Avatar/variants/AvatarAccount';

export const TEST_ACCOUNT_ADDRESS =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
export const TEST_CELL_TITLE = 'Orangefox.eth';
export const TEST_CELL_SECONDARY_TEXT =
  '0x2990079bcdEe240329a520d2444386FC119da21a';
export const TEST_CELL_TERTIARY_TEXT = 'Updated 1 sec ago';
export const TEST_TAG_LABEL_TEXT = 'Imported';

export const CELL_DISPLAY_TEST_ID = 'cell-display';
export const CELL_MULTI_SELECT_TEST_ID = 'cell-multi-select';
export const CELL_SELECT_TEST_ID = 'cell-select';

export const TEST_AVATAR_PROPS: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: TEST_ACCOUNT_ADDRESS,
  type: AvatarAccountType.JazzIcon,
};

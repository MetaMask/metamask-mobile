// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import { PickerBaseProps } from '../PickerBase';

/**
 * PickerAccount component props.
 */
export interface PickerAccountProps extends Omit<PickerBaseProps, 'children'> {
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * AvatarAccount variants.
   */
  accountAvatarType: AvatarAccountType;
  /**
   * Name of the account.
   */
  accountName: string;
}

/**
 * Style sheet input parameters.
 */
export type PickerAccountStyleSheetVars = Pick<PickerAccountProps, 'style'>;

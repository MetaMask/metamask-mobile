// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';

/**
 * CellAccountBaseItem variants.
 */
export enum CellAccountItemType {
  Select = 'Select',
  Multiselect = 'Multiselect',
  Display = 'Display',
}

/**
 * Cell Account Display Item component props.
 */
export interface CellAccountBaseItemProps extends ViewProps {
  /**
   * Type of CellAccountItem
   */
  type?: CellAccountItemType;
  /**
   * An Ethereum wallet address to retrieve avatar.
   */
  avatarAccountAddress: string;
  /**
   * AvatarAccount variants.
   */
  avatarAccountType: AvatarAccountType;
  /**
   * Title of the Cell Account, 1 line truncation.
   */
  title: string;
  /**
   * Optional secondary text below the title, 1 line truncation.
   */
  secondaryText?: string;
  /**
   * Optional tertiary text below the secondaryText, 1 line truncation.
   */
  tertiaryText?: string;
  /**
   * Optional label (using Tag component) below the title/secondaryText/tertiaryText.
   */
  tagLabel?: string;
  /**
   * Optional accessory that can be inserted on the right of Cell Account.
   */
  children?: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountBaseItemStyleSheetVars = Pick<
  CellAccountBaseItemProps,
  'style'
>;

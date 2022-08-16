// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';

/**
 * CellBase variants.
 */
export enum CellType {
  Select = 'Select',
  Multiselect = 'Multiselect',
  Display = 'Display',
}

/**
 * Cell Account component props.
 */
export interface CellBaseProps extends ViewProps {
  /**
   * Type of Cell
   */
  type?: CellType;
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
export type CellBaseStyleSheetVars = Pick<CellBaseProps, 'style'>;

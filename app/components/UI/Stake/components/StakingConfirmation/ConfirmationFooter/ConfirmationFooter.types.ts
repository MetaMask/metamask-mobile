import { FooterButtonGroupActions } from './FooterButtonGroup/FooterButtonGroup.types';

export interface ConfirmationFooterProps {
  valueWei: string; // deposit, unstake, and claim value
  action: FooterButtonGroupActions;
}

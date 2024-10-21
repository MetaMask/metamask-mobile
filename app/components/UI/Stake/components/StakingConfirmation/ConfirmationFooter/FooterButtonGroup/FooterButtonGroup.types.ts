export enum FooterButtonGroupActions {
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
}

export interface FooterButtonGroupProps {
  valueWei: string; // deposit, unstake, and claim value
  action: FooterButtonGroupActions;
}

interface DepositButtonClicked {
  text: 'Deposit';
  location: string;
  chain_id_destination?: string;
}

export interface AnalyticsEvents {
  DEPOSIT_BUTTON_CLICKED: DepositButtonClicked;
}

export enum ContractType {
  token = 'token',
  contract = 'contract',
}

export interface ContractBaseProps {
  address: string;
  name?: string;
  icon?: string;
  type: ContractType;
  description?: string;
}

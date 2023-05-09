import { BaseConfig, BaseState } from '@metamask/base-controller';

export interface SCAccount {
  signer: unknown;
  keyring: unknown;
}

export interface SCAConfig extends BaseConfig {
  provider: any;
}

export interface SCAState extends BaseState {
  accounts: SCAccount[];
  salt: string;
}

import { BaseConfig, BaseState } from '@metamask/base-controller';
import type { BigNumber } from 'ethers';

export interface SCAccount {
  address: string;
  signer: { address: string; privateKey: string };
  salt: BigNumber;
}

export interface SCAConfig extends BaseConfig {
  provider: any;
}

export interface SCAState extends BaseState {
  accounts: SCAccount[];
}

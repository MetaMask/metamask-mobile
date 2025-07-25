import WalletConnect2Session from './WalletConnect2Session';

export interface InitParams {
  sessions?: { [topic: string]: WalletConnect2Session };
}

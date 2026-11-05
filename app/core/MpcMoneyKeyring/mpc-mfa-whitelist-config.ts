import type { MfaWhitelistConfig } from '@metamask/money-account-mfa-whitelist';

// Dev values; must match mpc-service's config.
export const MPC_MFA_WHITELIST_CONFIG: MfaWhitelistConfig = {
  chainId: '0x8f',
  contracts: {
    DelegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
    EIP7702StatelessDeleGatorImpl: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
    ERC20TransferAmountEnforcer: '0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc',
    ExactExecutionBatchEnforcer: '0x1e141e455d08721Dd5BCDA1BaA6Ea5633Afd5017',
    ExactExecutionEnforcer: '0x146713078D39eCC1F5338309c28405ccf85Abfbb',
    LimitedCallsEnforcer: '0x04658B29F6b82ed55274221a06Fc97D318E25416',
    RedeemerEnforcer: '0xE144b0b2618071B4E56f746313528a669c7E65c5',
    TimestampEnforcer: '0x1046bb45C8d673d4ea75321280DB34899413c069',
    ValueLteEnforcer: '0x92Bf12322527cAA612fd31a0e810472BBB106A8F',
  },
  musdTokenAddress: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  chompDelegateAddress: '0xb4827A2a066CD2Ef88560EFdf063dD05C6c41cC7',
  vaults: [
    {
      boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
      tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
      vedaVaultAdapterAddress: '0xaD4c09d065fDb6320FA8ADf69460CDd9d472C25A',
    },
    {
      boringVault: '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7',
      tellerAddress: '0xB0025a2eBc0474d4F28E975F0D3E70471246ebae',
      vedaVaultAdapterAddress: '0x9AF808DA682aC92AA23CF40509F5A3694445e2b7',
    },
  ],
  cardSignInDomain: 'link.metamask.io',
};

import { ApprovalRequest } from '@metamask/approval-controller';
import { Hex } from '@metamask/utils';
import { GasFeeState } from '@metamask/gas-fee-controller';
import { Interface } from '@ethersproject/abi';
import {
  MessageParamsPersonal,
  MessageParamsTyped,
  SignatureRequest,
  SignatureRequestStatus,
  SignatureRequestType,
} from '@metamask/signature-controller';
import {
  TransactionControllerState,
  TransactionEnvelopeType,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { backgroundState } from './initial-root-state';
import {
  Reason,
  ResultType,
  SecurityAlertSource,
} from '../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';

const mockTypeDefEIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

export const personalSignSignatureRequest = {
  chainId: '0x1',
  type: SignatureRequestType.PersonalSign,
  id: 'aa2b3071-d946-11ef-9f90-a5603493ed8d',
  messageParams: {
    data: '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    meta: {
      url: 'https://metamask.github.io/test-dapp/',
      title: 'E2E Test Dapp',
      icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
      analytics: { request_source: 'In-App-Browser' },
    },
    origin: 'metamask.github.io',
    metamaskId: '76b33b40-7b5c-11ef-bc0a-25bce29dbc09',
  },
  networkClientId: '1',
  status: SignatureRequestStatus.Unapproved,
  time: 1733143817088,
} as SignatureRequest;

export const personalSignatureConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          '76b33b40-7b5c-11ef-bc0a-25bce29dbc09': {
            id: '76b33b40-7b5c-11ef-bc0a-25bce29dbc09',
            origin: 'metamask.github.io',
            type: SignatureRequestType.PersonalSign,
            time: 1727282253048,
            requestData: {
              data: '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
              from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
                analytics: { request_source: 'In-App-Browser' },
              },
              origin: 'metamask.github.io',
              metamaskId: '76b33b40-7b5c-11ef-bc0a-25bce29dbc09',
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      SignatureController: {
        signatureRequests: {
          '76b33b40-7b5c-11ef-bc0a-25bce29dbc09': {
            chainId: '0x1' as Hex,
            messageParams: {
              data: '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
              from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
                analytics: { request_source: 'In-App-Browser' },
              },
              origin: 'metamask.github.io',
              metamaskId: '76b33b40-7b5c-11ef-bc0a-25bce29dbc09',
            } as MessageParamsTyped,
          },
        },
      },
    },
  },
};

export const siweSignSignatureRequest = {
  ...personalSignSignatureRequest,
  messageParams: {
    ...personalSignSignatureRequest.messageParams,
    data: '0x6d6574616d61736b2e6769746875622e696f2077616e747320796f7520746f207369676e20696e207769746820796f757220457468657265756d206163636f756e743a0a3078386565656531373831666438383566663564646566373738393438363637363936313837336431320a0a492061636365707420746865204d6574614d61736b205465726d73206f6620536572766963653a2068747470733a2f2f636f6d6d756e6974792e6d6574616d61736b2e696f2f746f730a0a5552493a2068747470733a2f2f6d6574616d61736b2e6769746875622e696f0a56657273696f6e3a20310a436861696e2049443a20310a4e6f6e63653a2033323839313735370a4973737565642041743a20323032312d30392d33305431363a32353a32342e3030305a',
    siwe: {
      isSIWEMessage: true,
      parsedMessage: {
        domain: 'metamask.github.io',
        address: '0x8eeee1781fd885ff5ddef7789486676961873d12',
        statement:
          'I accept the MetaMask Terms of Service: https://community.metamask.io/tos',
        uri: 'https://metamask.github.io',
        version: '1',
        chainId: 1,
        nonce: '32891757',
        issuedAt: '2021-09-30T16:25:24.000Z',
        requestId: '12345',
        resources: ['resource-1', 'resource-2', 'resource-3'],
      },
    },
  },
} as unknown as SignatureRequest;

export const siweSignatureConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          '72424261-e22f-11ef-8e59-bf627a5d8354': {
            id: '72424261-e22f-11ef-8e59-bf627a5d8354',
            origin: 'metamask.github.io',
            type: 'personal_sign',
            time: 1738587888035,
            requestData: {
              data: '0x6d6574616d61736b2e6769746875622e696f2077616e747320796f7520746f207369676e20696e207769746820796f757220457468657265756d206163636f756e743a0a3078386565656531373831666438383566663564646566373738393438363637363936313837336431320a0a492061636365707420746865204d6574614d61736b205465726d73206f6620536572766963653a2068747470733a2f2f636f6d6d756e6974792e6d6574616d61736b2e696f2f746f730a0a5552493a2068747470733a2f2f6d6574616d61736b2e6769746875622e696f0a56657273696f6e3a20310a436861696e2049443a20310a4e6f6e63653a2033323839313735370a4973737565642041743a20323032312d30392d33305431363a32353a32342e3030305a',
              from: '0x8eeee1781fd885ff5ddef7789486676961873d12',
              requestId: 106737718,
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: {},
                analytics: { request_source: 'In-App-Browser' },
              },
              origin: 'metamask.github.io',
              siwe: (
                siweSignSignatureRequest.messageParams as MessageParamsPersonal
              ).siwe,
              metamaskId: '72424260-e22f-11ef-8e59-bf627a5d8354',
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      SignatureController: {
        signatureRequests: {
          '72424261-e22f-11ef-8e59-bf627a5d8354': siweSignSignatureRequest,
        },
      },
    },
  },
};

export const typedSignV1SignatureRequest = {
  chainId: '0x1' as Hex,
  messageParams: {
    data: [
      { type: 'string', name: 'Message', value: 'Hi, Alice!' },
      { type: 'uint32', name: 'A number', value: '1337' },
    ],
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    requestId: 2453610887,
    meta: {
      url: 'https://metamask.github.io/test-dapp/',
      title: 'E2E Test Dapp',
      icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
      analytics: { request_source: 'In-App-Browser' },
    },
    origin: 'metamask.github.io',
    metamaskId: '7e62bcb0-a4e9-11ef-9b51-ddf21c91a998',
    version: 'V1',
  } as MessageParamsTyped,
} as SignatureRequest;

export const typedSignV1ConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998': {
            id: '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998',
            origin: 'metamask.github.io',
            type: SignatureRequestType.TypedSign,
            time: 1731850822653,
            requestData: {
              data: [
                { type: 'string', name: 'Message', value: 'Hi, Alice!' },
                { type: 'uint32', name: 'A number', value: '1337' },
              ],
              from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
              requestId: 2453610887,
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
                analytics: { request_source: 'In-App-Browser' },
              },
              origin: 'metamask.github.io',
              metamaskId: '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998',
              version: 'V1',
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      SignatureController: {
        signatureRequests: {
          '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998': typedSignV1SignatureRequest,
        },
      },
    },
  },
};

export const mockTypedSignV3Message = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
    ],
  },
  primaryType: 'Mail',
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  message: {
    from: { name: 'Cow', wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
    to: { name: 'Bob', wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' },
    contents: 'Hello, Bob!',
  },
};

export const typedSignV3SignatureRequest = {
  chainId: '0x1' as Hex,
  type: SignatureRequestType.TypedSign,
  messageParams: {
    data: JSON.stringify(mockTypedSignV3Message),
    from: '0x8eeee1781fd885ff5ddef7789486676961873d12',
    requestId: 3298650200,
    meta: {
      url: 'https://metamask.github.io/test-dapp/',
      title: 'E2E Test Dapp',
      icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
      analytics: { request_source: 'In-App-Browser' },
    },
    origin: 'metamask.github.io',
    metamaskId: 'fb2029e1-b0ab-11ef-9227-05a11087c334',
    version: 'V3',
  } as MessageParamsTyped,
} as SignatureRequest;

export const typedSignV3ConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          'fb2029e1-b0ab-11ef-9227-05a11087c334': {
            id: 'fb2029e1-b0ab-11ef-9227-05a11087c334',
            origin: 'metamask.github.io',
            type: SignatureRequestType.TypedSign,
            time: 1733143817088,
            requestData: {
              data: JSON.stringify(mockTypedSignV3Message),
              from: '0x8eeee1781fd885ff5ddef7789486676961873d12',
              requestId: 3298650200,
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
                analytics: { request_source: 'In-App-Browser' },
              },
              origin: 'metamask.github.io',
              metamaskId: 'fb2029e1-b0ab-11ef-9227-05a11087c334',
              version: 'V3',
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      SignatureController: {
        signatureRequests: {
          'fb2029e1-b0ab-11ef-9227-05a11087c334': typedSignV3SignatureRequest,
        },
      },
    },
  },
};

export const typedSignV4SignatureRequest = {
  id: 'fb2029e1-b0ab-11ef-9227-05a11087c334',
  chainId: '0x1' as Hex,
  type: SignatureRequestType.TypedSign,
  messageParams: {
    data: '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Permit":[{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"Permit","domain":{"name":"MyToken","version":"1","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","chainId":1},"message":{"owner":"0x935e73edb9ff52e23bac7f7e043a1ecd06d05477","spender":"0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","value":3000,"nonce":0,"deadline":50000000000}}',
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    version: 'V4',
    requestId: 14,
    signatureMethod: 'eth_signTypedData_v4',
    origin: 'https://metamask.github.io',
    metamaskId: 'fb2029e0-b0ab-11ef-9227-05a11087c334',
    meta: {
      url: 'https://metamask.github.io/test-dapp/',
      title: 'E2E Test Dapp',
      icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
      analytics: { request_source: 'In-App-Browser' },
    },
  },
  networkClientId: '1',
  status: SignatureRequestStatus.Unapproved,
  time: 1733143817088,
} as SignatureRequest;

export const typedSignV4ConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          'fb2029e1-b0ab-11ef-9227-05a11087c334': {
            id: 'fb2029e1-b0ab-11ef-9227-05a11087c334',
            origin: 'metamask.github.io',
            type: SignatureRequestType.TypedSign,
            time: 1733143817088,
            requestData: {
              data: '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Permit":[{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"Permit","domain":{"name":"MyToken","version":"1","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","chainId":1},"message":{"owner":"0x935e73edb9ff52e23bac7f7e043a1ecd06d05477","spender":"0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","value":3000,"nonce":0,"deadline":50000000000}}',
              from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
              version: 'V4',
              requestId: 14,
              signatureMethod: 'eth_signTypedData_v4',
              origin: 'https://metamask.github.io',
              metamaskId: 'fb2029e0-b0ab-11ef-9227-05a11087c334',
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
                analytics: { request_source: 'In-App-Browser' },
              },
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      SignatureController: {
        signatureRequests: {
          'fb2029e1-b0ab-11ef-9227-05a11087c334': typedSignV4SignatureRequest,
        },
      },
    },
  },
};

export const typedSignV4NFTSignatureRequest = {
  id: 'c5067710-87cf-11ef-916c-71f266571322',
  chainId: '0x1' as Hex,
  type: SignatureRequestType.TypedSign,
  messageParams: {
    data: '{"domain":{"name":"Uniswap V3 Positions NFT-V1","version":"1","chainId":1,"verifyingContract":"0xC36442b4a4522E871399CD717aBDD847Ab11FE88"},"types":{"Permit":[{"name":"spender","type":"address"},{"name":"tokenId","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"Permit","message":{"spender":"0x00000000Ede6d8D217c60f93191C060747324bca","tokenId":"3606393","nonce":"0","deadline":"1734995006"}}',
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    version: 'V4',
    requestId: 14,
    signatureMethod: 'eth_signTypedData_v4',
    origin: 'https://metamask.github.io',
    metamaskId: 'fb2029e0-b0ab-11ef-9227-05a11087c334',
    meta: {
      url: 'https://metamask.github.io/test-dapp/',
      title: 'E2E Test Dapp',
      icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
      analytics: { request_source: 'In-App-Browser' },
    },
  },
  networkClientId: '1',
  status: SignatureRequestStatus.Unapproved,
  time: 1733143817088,
} as SignatureRequest;

export const typedSignV4NFTConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          'c5067710-87cf-11ef-916c-71f266571322': {
            id: 'c5067710-87cf-11ef-916c-71f266571322',
            origin: 'metamask.github.io',
            type: SignatureRequestType.TypedSign,
            time: 1733143817088,
            requestData: {
              data: '{"domain":{"name":"Uniswap V3 Positions NFT-V1","version":"1","chainId":1,"verifyingContract":"0xC36442b4a4522E871399CD717aBDD847Ab11FE88"},"types":{"Permit":[{"name":"spender","type":"address"},{"name":"tokenId","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"Permit","message":{"spender":"0x00000000Ede6d8D217c60f93191C060747324bca","tokenId":"3606393","nonce":"0","deadline":"1734995006"}}',
              from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
              version: 'V4',
              requestId: 2874791875,
              signatureMethod: 'eth_signTypedData_v4',
              origin: 'https://metamask.github.io',
              metamaskId: 'fb2029e0-b0ab-11ef-9227-05a11087c334',
              meta: {
                url: 'https://metamask.github.io/test-dapp/',
                title: 'E2E Test Dapp',
                icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
                analytics: { request_source: 'In-App-Browser' },
              },
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      SignatureController: {
        signatureRequests: {
          'c5067710-87cf-11ef-916c-71f266571322':
            typedSignV4NFTSignatureRequest,
        },
      },
    },
  },
};

export const securityAlertResponse = {
  block: 21572398,
  result_type: ResultType.Malicious,
  reason: Reason.permitFarming,
  description:
    'permit_farming to spender 0x1661f1b207629e4f385da89cff535c8e5eb23ee3, classification: A known malicious address is involved in the transaction',
  features: ['A known malicious address is involved in the transaction'],
  source: SecurityAlertSource.API,
  securityAlertId: '43d40543-463a-4400-993c-85a04017ea2b',
  req: {
    channelId: undefined,
    data: '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Permit":[{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"Permit","domain":{"name":"USD Coin","verifyingContract":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","chainId":1,"version":"2"},"message":{"owner":"0x8eeee1781fd885ff5ddef7789486676961873d12","spender":"0x1661F1B207629e4F385DA89cFF535C8E5Eb23Ee3","value":"1033366316628","nonce":1,"deadline":1678709555}}',
    from: '0x8eeee1781fd885ff5ddef7789486676961873d12',
    meta: {
      analytics: {
        request_platform: undefined,
        request_source: 'In-App-Browser',
      },
      channelId: undefined,
      icon: { uri: 'https://metamask.github.io/test-dapp/metamask-fox.svg' },
      title: 'E2E Test Dapp',
      url: 'https://metamask.github.io/test-dapp/',
    },
    metamaskId: '967066d0-ccf4-11ef-8589-cb239497eefc',
    origin: 'metamask.github.io',
    requestId: 2048976252,
    securityAlertResponse: undefined,
    version: 'V4',
  },
  chainId: '0x1',
};

const stakingConfirmationBaseState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            '0x0000000000000000000000000000000000000000': {
              id: '0x0000000000000000000000000000000000000000',
              address: '0x0000000000000000000000000000000000000000',
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
          selectedAccount: '0x0000000000000000000000000000000000000000',
        },
      },
      ApprovalController: {
        pendingApprovals: {
          '699ca2f0-e459-11ef-b6f6-d182277cf5e1': {
            expectsResult: true,
            id: '699ca2f0-e459-11ef-b6f6-d182277cf5e1',
            origin: 'metamask',
            requestData: { txId: '699ca2f0-e459-11ef-b6f6-d182277cf5e1' },
            requestState: null,
            time: 1738825814816,
            type: 'transaction',
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionDate: 1732887955.694,
            conversionRate: 3596.25,
            usdConversionRate: 3596.25,
          },
          LineaETH: {
            conversionDate: 1732887955.694,
            conversionRate: 3596.25,
            usdConversionRate: 3596.25,
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            '0x0000000000000000000000000000000000000000': [
              {
                address: '0x0000000000000000000000000000000000000000',
                aggregators: [],
                balance: '0xde0b6b3a7640000',
                chainId: '0x1',
                decimals: 18,
                isETH: true,
                isNative: true,
                name: 'Ethereum',
                symbol: 'ETH',
                ticker: 'ETH',
              },
            ],
          },
        },
      },
      TransactionController: {
        transactions: [
          {
            actionId: undefined,
            chainId: '0x1',
            dappSuggestedGasFees: undefined,
            defaultGasEstimates: {
              estimateType: 'medium',
              gas: '0x1a5bd',
              gasPrice: undefined,
              maxFeePerGas: '0x74594b20',
              maxPriorityFeePerGas: '0x1dcd6500',
            },
            deviceConfirmedOn: 'metamask_mobile',
            gasLimitNoBuffer: '0x11929',
            id: '699ca2f0-e459-11ef-b6f6-d182277cf5e1',
            isFirstTimeInteraction: undefined,
            networkClientId: 'mainnet',
            origin: 'metamask',
            originalGasEstimate: '0x1a5bd',
            securityAlertResponse: undefined,
            simulationFails: undefined,
            status: 'unapproved',
            time: 1738825814687,
            txParams: {
              data: '0xf9609f08000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c1640000000000000000000000000000000000000000000000000000000000000000',
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
              gas: '0x1a5bd',
              maxFeePerGas: '0x84594b20',
              maxPriorityFeePerGas: '0x4dcd6500',
              to: '0x4fef9d741011476750a243ac70b9789a63dd47df',
              value: '0x5af3107a4000',
              type: TransactionEnvelopeType.feeMarket,
            },
            type: TransactionType.stakingUnstake,
            userEditedGasLimit: false,
            userFeeLevel: 'medium',
            verifiedOnBlockchain: false,
            gasFeeEstimates: {
              high: {
                maxFeePerGas: '0xd0f5f04a',
                maxPriorityFeePerGas: '0x77359400',
              },
              low: {
                maxFeePerGas: '0x274d76df',
                maxPriorityFeePerGas: '0x47be0d',
              },
              medium: {
                maxFeePerGas: '0x559ab26a',
                maxPriorityFeePerGas: '0x1dcd6500',
              },
              type: 'fee-market',
            },
          },
        ],
      } as unknown as TransactionControllerState,
      NetworkController: {
        networksMetadata: {
          mainnet: {
            EIPS: { 1559: true },
          },
          sepolia: {
            EIPS: { 1559: true },
          },
        },
        networkConfigurationsByChainId: {
          ...backgroundState.NetworkController.networkConfigurationsByChainId,
          '0xaa36a7': {
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
                url: 'https://sepolia.infura.io/v3/1234567890',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
        selectedNetworkClientId: 'mainnet',
      },
      GasFeeController: {
        gasFeeEstimatesByChainId: {
          '0x1': {
            gasEstimateType: 'fee-market',
            gasFeeEstimates: {
              baseFeeTrend: 'down',
              estimatedBaseFee: '0.657622129',
              high: {
                maxWaitTimeEstimate: 30000,
                minWaitTimeEstimate: 15000,
                suggestedMaxFeePerGas: '3.554606064',
                suggestedMaxPriorityFeePerGas: '2',
              },
              historicalBaseFeeRange: ['0.570409997', '0.742901351'],
              historicalPriorityFeeRange: ['0.0001', '40.023291076'],
              latestPriorityFeeRange: ['0.001014498', '3'],
              low: {
                maxWaitTimeEstimate: 60000,
                minWaitTimeEstimate: 15000,
                suggestedMaxFeePerGas: '0.750628835',
                suggestedMaxPriorityFeePerGas: '0.006017503',
              },
              medium: {
                maxWaitTimeEstimate: 45000,
                minWaitTimeEstimate: 15000,
                suggestedMaxFeePerGas: '1.65994205',
                suggestedMaxPriorityFeePerGas: '0.5',
              },
              networkCongestion: 0.10665,
              priorityFeeTrend: 'up',
            },
          },
        },
      } as unknown as GasFeeState,
    },
  },
  settings: {
    showFiatOnTestnets: true,
  },
};

export const stakingDepositConfirmationState = merge(
  {},
  stakingConfirmationBaseState,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [{ type: TransactionType.stakingDeposit }],
        } as unknown as TransactionControllerState,
      },
    },
  },
);

export const stakingWithdrawalConfirmationState = merge(
  {},
  stakingConfirmationBaseState,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [{ type: TransactionType.stakingUnstake }],
        } as unknown as TransactionControllerState,
      },
    },
  },
);

export const stakingClaimConfirmationState = merge(
  {},
  stakingConfirmationBaseState,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [{ type: TransactionType.stakingClaim }],
        } as unknown as TransactionControllerState,
      },
    },
  },
);

export enum SignTypedDataMockType {
  BATCH = 'BATCH',
  DAI = 'DAI',
}

const SIGN_TYPE_DATA: Record<SignTypedDataMockType, string> = {
  [SignTypedDataMockType.BATCH]: JSON.stringify({
    types: {
      EIP712Domain: mockTypeDefEIP712Domain,
      PermitBatch: [
        { name: 'details', type: 'PermitDetails[]' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' },
      ],
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' },
      ],
    },
    domain: {
      name: 'Permit2',
      chainId: '1',
      version: '1',
      verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3',
    },
    primaryType: 'PermitBatch',
    message: {
      details: [
        {
          token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amount: '1461501637330902918203684832716283019655932542975',
          expiration: '1722887542',
          nonce: '5',
        },
        {
          token: '0xb0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amount: '250',
          expiration: '1722887642',
          nonce: '6',
        },
      ],
      spender: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
      sigDeadline: '1720297342',
    },
  }),
  [SignTypedDataMockType.DAI]: JSON.stringify({
    domain: {
      name: 'Dai Stablecoin',
      version: '1',
      chainId: 1,
      verifyingContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    types: {
      EIP712Domain: mockTypeDefEIP712Domain,
      Permit: [
        { name: 'holder', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
        { name: 'allowed', type: 'bool' },
      ],
    },
    primaryType: 'Permit',
    message: {
      spender: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      tokenId: '3606393',
      nonce: 0,
      expiry: 0,
      allowed: false,
    },
  }),
};

export function generateStateSignTypedData(mockType: SignTypedDataMockType) {
  const mockSignatureRequest = {
    id: 'c5067710-87cf-11ef-916c-71f266571322',
    chainId: '0x1' as Hex,
    type: SignatureRequestType.TypedSign,
    messageParams: {
      data: SIGN_TYPE_DATA[mockType],
      from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
      version: 'V4',
      requestId: 14,
      signatureMethod: 'eth_signTypedData_v4',
      origin: 'https://metamask.github.io',
      metamaskId: 'fb2029e0-b0ab-11ef-9227-05a11087c334',
      meta: {
        url: 'https://metamask.github.io/test-dapp/',
        title: 'E2E Test Dapp',
        icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
        analytics: { request_source: 'In-App-Browser' },
      },
    },
    networkClientId: '1',
    status: SignatureRequestStatus.Unapproved,
    time: 1733143817088,
  } as SignatureRequest;

  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        ApprovalController: {
          pendingApprovals: {
            'c5067710-87cf-11ef-916c-71f266571322': {
              id: 'c5067710-87cf-11ef-916c-71f266571322',
              origin: 'metamask.github.io',
              type: SignatureRequestType.TypedSign,
              time: 1733143817088,
              requestData: { ...mockSignatureRequest },
              requestState: null,
              expectsResult: true,
            },
          },
          pendingApprovalCount: 1,
          approvalFlows: [],
        },
        SignatureController: {
          signatureRequests: {
            'c5067710-87cf-11ef-916c-71f266571322': mockSignatureRequest,
          },
        },
      },
    },
  };
}

export const mockTxId = '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998';

export const mockApprovalRequest = {
  id: mockTxId,
  origin: 'metamask.github.io',
  type: 'transaction',
  time: 1731850822653,
  requestData: {
    txId: mockTxId,
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    origin: 'metamask.github.io',
  },
  requestState: null,
  expectsResult: true,
} as unknown as ApprovalRequest<TransactionMeta>;

export const mockTransaction = {
  id: mockTxId,
  type: TransactionType.contractInteraction,
  txParams: {
    data: '0x123456',
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    to: '0x1234567890123456789012345678901234567890',
    value: '0x0',
  },
  chainId: '0x1' as `0x${string}`,
  networkClientId: 'mainnet',
  status: TransactionStatus.unapproved,
  time: Date.now(),
  origin: 'https://metamask.github.io',
} as unknown as TransactionMeta;

export const contractInteractionBaseState = merge(
  {},
  stakingConfirmationBaseState,
  {
    engine: {
      backgroundState: {
        TransactionController: { transactions: [mockTransaction] },
      },
    },
  },
);

export const generateContractInteractionState = {
  ...contractInteractionBaseState,
  engine: {
    ...contractInteractionBaseState.engine,
    backgroundState: {
      ...contractInteractionBaseState.engine.backgroundState,
      // Set a completely new ApprovalController to reject the approval in
      // stakingConfirmationBaseState
      ApprovalController: {
        pendingApprovals: { [mockTxId]: mockApprovalRequest },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
    },
  },
};

export const transferConfirmationState = merge(
  {},
  stakingConfirmationBaseState,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              type: TransactionType.simpleSend,
              txParams: {
                from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
                gas: '0x1a5bd',
                maxFeePerGas: '0x84594b20',
                maxPriorityFeePerGas: '0x4dcd6500',
                to: '0x4fef9d741011476750a243ac70b9789a63dd47df',
                value: '0x5af3107a4000',
                type: TransactionEnvelopeType.feeMarket,
              },
            },
          ],
        } as Pick<TransactionControllerState, 'transactions'>,
      },
    },
  },
);

export const getAppStateForConfirmation = (
  confirmation: TransactionMeta,
  backgroundStateArgs: Record<string, unknown> = {},
) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      ...backgroundStateArgs,
      ApprovalController: {
        pendingApprovals: {
          [confirmation.id]: {
            id: confirmation.id,
            origin: confirmation.origin,
            type: 'transaction',
            requestData: {
              txId: confirmation.id,
              from: confirmation.txParams.from,
              origin: confirmation.origin,
            },
            requestState: null,
            expectsResult: true,
          },
        },
        pendingApprovalCount: 1,
        approvalFlows: [],
      },
      TransactionController: {
        transactions: [confirmation],
      },
    },
  },
});

const switchAccountConfirmation = {
  chainId: '0xaa36a7',
  networkClientId: 'sepolia',
  origin: 'metamask',
  status: 'unapproved',
  userEditedGasLimit: false,
  verifiedOnBlockchain: false,
  gasFeeEstimates: {
    userFeeLevel: 'medium',
    sendFlowHistory: [],
    gasFeeEstimates: {
      type: 'fee-market',
      low: { maxFeePerGas: '0x9374a3b7', maxPriorityFeePerGas: '0x3b9aca00' },
      medium: {
        maxFeePerGas: '0xd0017b51',
        maxPriorityFeePerGas: '0x59682f00',
      },
      high: { maxFeePerGas: '0x10c8e52eb', maxPriorityFeePerGas: '0x77359400' },
    },
  },
};

export const upgradeAccountConfirmation = {
  ...switchAccountConfirmation,
  batchId: '0x6046131032d748a6bfac42fd5117479f',
  id: 'aa0ff2b0-150f-11f0-9325-8f0b8505bc4f',
  origin: 'metamask.github.io',
  nestedTransactions: [
    {
      to: '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb',
      data: '0x654365436543',
      value: '0x3B9ACA00',
      type: TransactionType.simpleSend,
    },
    {
      to: '0xbc2114a988e9CEf5bA63548D432024f34B487048',
      data: '0x789078907890',
      value: '0x1DCD6500',
      type: TransactionType.simpleSend,
    },
  ],
  securityAlertResponse: {
    block: 8082431,
    result_type: ResultType.Benign,
    reason: Reason.notApplicable,
    description: '',
    features: [],
    source: SecurityAlertSource.API,
    securityAlertId: '31cda7d5-9657-4567-b364-d6918f0933a0',
  },
  txParams: {
    from: '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
    authorizationList: [
      { address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B' },
    ],
    data: '0xe9ae5c530100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000c54fccd2e384b4bb6f2e405bf5cbc15a017aafb000000000000000000000000000000000000000000000000000000003b9aca00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000066543654365430000000000000000000000000000000000000000000000000000000000000000000000000000bc2114a988e9cef5ba63548d432024f34b487048000000000000000000000000000000000000000000000000000000001dcd650000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000006789789078900000000000000000000000000000000000000000000000000000',
    gas: '0x1a209',
    to: '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
    value: '0x0',
    maxFeePerGas: '0x21b65659b',
    maxPriorityFeePerGas: '0x59682f00',
    type: '0x4',
  },
  type: 'batch',
  originalGasEstimate: '0x1a209',
  defaultGasEstimates: {
    gas: '0x1a209',
    maxFeePerGas: '0x21b65659b',
    maxPriorityFeePerGas: '0x59682f00',
    estimateType: 'medium',
  },
  gasFeeTokens: [],
  simulationData: {
    nativeBalanceChange: {
      previousBalance: '0x109f1f975d02012',
      newBalance: '0x109f1f91c67f112',
      difference: '0x59682f00',
      isDecrease: true,
    },
    tokenBalanceChanges: [],
  },
} as unknown as TransactionMeta;

export const upgradeOnlyAccountConfirmation = {
  ...upgradeAccountConfirmation,
  origin: 'metamask',
  nestedTransactions: [],
  txParams: {
    ...upgradeAccountConfirmation.txParams,
    data: '0x',
  },
} as unknown as TransactionMeta;

export const downgradeAccountConfirmation = {
  ...switchAccountConfirmation,
  delegationAddress: '0xcd8d6c5554e209fbb0dec797c6293cf7eae13454',
  id: '22c82900-1134-11f0-a4de-3b789e5a89ad',
  txParams: {
    from: '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
    authorizationList: [
      { address: '0x0000000000000000000000000000000000000000' },
    ],
    gas: '0x11017',
    to: '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
    value: '0x0',
    maxFeePerGas: '0xd0017b51',
    maxPriorityFeePerGas: '0x59682f00',
    type: '0x4',
  },
  type: TransactionType.revokeDelegation,
  defaultGasEstimates: {
    gas: '0x11017',
    maxFeePerGas: '0xd0017b51',
    maxPriorityFeePerGas: '0x59682f00',
    estimateType: 'medium',
  },
} as unknown as TransactionMeta;

export const batchApprovalConfirmation = {
  batchId: '0xac5b147713b64947a1848309dc528c95',
  chainId: '0x1',
  delegationAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
  id: '00e2c3a0-3537-11f0-a6bc-c5da15141f51',
  nestedTransactions: [
    {
      data: '0x095ea7b30000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000009184e72a000',
      to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      type: 'approve',
    },
    {
      data: '0x4666fc801137140f3717bc6b605645d86122fa67acca7687a3f5ee603c321eead00b212e00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000000000000000000000000000000000000000000090000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000f6a756d7065722e65786368616e67650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a3078303030303030303030303030303030303030303030303030303030303030303030303030303030300000000000000000000000000000000000000000000000000000000000000000000085cd07ea01423b1e937929b44e4ad8c40bbb5e7100000000000000000000000085cd07ea01423b1e937929b44e4ad8c40bbb5e710000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000184dd9c5f960000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000900000000000000000000000000000000000000000000000000000000000000080000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045026b175474e89094c44da98b954eedeac495271d0f01ffff00b5214edee5741324a13539bcc207bc549e2491ff0185cd07ea01423b1e937929b44e4ad8c40bbb5e71000bb800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      to: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
      type: 'contractInteraction',
    },
  ],
  networkClientId: 'mainnet',
  origin: 'jumper123.exchange',
  status: 'unapproved',
  txParams: {
    from: '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
    data: '0xe9ae5c5301000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001200000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000000000000000000000000000000000000000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000004044666fc801137140f3717bc6b605645d86122fa67acca7687a3f5ee603c321eead00b212e00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000000000000000000000000000000000000000000090000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000f6a756d7065722e65786368616e67650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a3078303030303030303030303030303030303030303030303030303030303030303030303030303030300000000000000000000000000000000000000000000000000000000000000000000085cd07ea01423b1e937929b44e4ad8c40bbb5e7100000000000000000000000085cd07ea01423b1e937929b44e4ad8c40bbb5e710000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000184dd9c5f960000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000009184e72a000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000900000000000000000000000000000000000000000000000000000000000000080000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045026b175474e89094c44da98b954eedeac495271d0f01ffff00b5214edee5741324a13539bcc207bc549e2491ff0185cd07ea01423b1e937929b44e4ad8c40bbb5e71000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    gas: '0x430c8',
    to: '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
    value: '0x0',
    maxFeePerGas: '0x56febcee',
    maxPriorityFeePerGas: '0x1dcd6500',
    type: '0x2',
  },
  type: 'batch',
  userEditedGasLimit: false,
  verifiedOnBlockchain: false,
  gasLimitNoBuffer: '0x430c8',
  originalGasEstimate: '0x430c8',
  defaultGasEstimates: {
    gas: '0x430c8',
    maxFeePerGas: '0x4ea9e5b3',
    maxPriorityFeePerGas: '0x1dcd6500',
    estimateType: 'medium',
  },
  userFeeLevel: 'medium',
  customNonceValue: '606',
  gasFeeEstimates: {
    type: 'fee-market',
    low: { maxFeePerGas: '0x28003a44', maxPriorityFeePerGas: '0x186a0' },
    medium: { maxFeePerGas: '0x56febcee', maxPriorityFeePerGas: '0x1dcd6500' },
    high: { maxFeePerGas: '0xd3329793', maxPriorityFeePerGas: '0x77359400' },
  },
  gasFeeEstimatesLoaded: true,
  simulationData: {
    tokenBalanceChanges: [
      {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        standard: 'erc20',
        previousBalance: '0x2d915e92d0fd02b0',
        newBalance: '0x2d91557a828a62b0',
        difference: '0x9184e72a000',
        isDecrease: true,
      },
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        standard: 'erc20',
        previousBalance: '0x2bcc4f',
        newBalance: '0x2bcc58',
        difference: '0x9',
        isDecrease: false,
      },
    ],
  },
} as unknown as TransactionMeta;

export const MOCK_NETWORK_CONTROLLER_STATE = {
  networkConfigurationsByChainId: {
    '0xaa36a7': {
      blockExplorerUrls: [],
      chainId: '0xaa36a7',
      defaultRpcEndpointIndex: 0,
      name: 'Sepolia',
      nativeCurrency: 'SepoliaETH',
      rpcEndpoints: [
        {
          failoverUrls: [],
          networkClientId: 'sepolia',
          type: 'infura',
          url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
        },
      ],
    },
    '0x18c7': {
      blockExplorerUrls: ['https://megaeth-testnet-v2.blockscout.com'],
      chainId: '0x18c7',
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: 0,
      name: 'MegaETH Testnet',
      nativeCurrency: 'MegaETH',
      rpcEndpoints: [
        {
          failoverUrls: [],
          networkClientId: 'megaeth-testnet-v2',
          type: 'custom',
          url: 'https://carrot.megaeth.com/rpc',
        },
      ],
    },
  },
};

export const MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE = {
  isEvmSelected: true,
  multichainNetworkConfigurationsByChainId: {
    'bip122:000000000019d6689c085ae165831e93': {
      chainId: 'bip122:000000000019d6689c085ae165831e93',
      isEvm: false,
      name: 'Bitcoin Mainnet',
      nativeCurrency: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      isEvm: false,
      name: 'Solana Mainnet',
      nativeCurrency:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
  },
  selectedMultichainNetworkChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export const MOCK_ACCOUNT_CONTROLLER_STATE = {
  internalAccounts: {
    accounts: {
      '94b520b3-a0c9-4cbd-a689-441a01630331': {
        id: '94b520b3-a0c9-4cbd-a689-441a01630331',
        address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        scopes: ['eip155:0'],
        type: 'eip155:eoa',
        metadata: {
          name: 'Account 1',
          importTime: 1746181774143,
          keyring: { type: 'HD Key Tree' },
          lastSelected: 1746191007939,
        },
      },
    },
    selectedAccount: '94b520b3-a0c9-4cbd-a689-441a01630331',
  },
};

export const MOCK_KEYRING_CONTROLLER_STATE = {
  isUnlocked: true,
  keyrings: [
    {
      type: 'HD Key Tree',
      accounts: [
        '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        '0x089595380921f555d52ab6f5a49defdaab23b444',
        '0xa4a80ce0afdfb8e6bd1221d3b18a1653eee6d19d',
      ],
      metadata: { id: '01JT88PPSFQW1C2SGPKTS874ZX', name: '' },
    },
    {
      type: 'QR Hardware Wallet Device',
      accounts: [],
      metadata: { id: '01JT88PSBXWQ36YBFJWHJAC9T2', name: '' },
    },
  ],
};

export function buildApproveTransactionData(
  address: string,
  amountOrTokenId: number,
): Hex {
  return new Interface([
    'function approve(address spender, uint256 amountOrTokenId)',
  ]).encodeFunctionData('approve', [address, amountOrTokenId]) as Hex;
}

export function buildPermit2ApproveTransactionData(
  token: string,
  spender: string,
  amount: number,
  expiration: number,
): Hex {
  return new Interface([
    'function approve(address token, address spender, uint160 amount, uint48 nonce)',
  ]).encodeFunctionData('approve', [token, spender, amount, expiration]) as Hex;
}

export function buildIncreaseAllowanceTransactionData(
  address: string,
  amount: number,
): Hex {
  return new Interface([
    'function increaseAllowance(address spender, uint256 addedValue)',
  ]).encodeFunctionData('increaseAllowance', [address, amount]) as Hex;
}

export function buildSetApproveForAllTransactionData(
  address: string,
  approved: boolean,
): Hex {
  return new Interface([
    'function setApprovalForAll(address operator, bool approved)',
  ]).encodeFunctionData('setApprovalForAll', [address, approved]) as Hex;
}

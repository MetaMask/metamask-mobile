import { GasFeeState } from '@metamask/gas-fee-controller';
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
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import { backgroundState } from './initial-root-state';

export const confirmationRedesignRemoteFlagsState = {
  remoteFeatureFlags: {
    confirmation_redesign: {
      signatures: true,
      staking_confirmations: true,
    },
  },
};

const mockTypeDefEIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
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
      RemoteFeatureFlagController: {
        ...confirmationRedesignRemoteFlagsState,
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
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmation_redesign: {
            signatures: true,
          },
        },
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
      RemoteFeatureFlagController: {
        ...confirmationRedesignRemoteFlagsState,
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
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          ...confirmationRedesignRemoteFlagsState,
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
  result_type: 'Malicious',
  reason: 'permit_farming',
  description:
    'permit_farming to spender 0x1661f1b207629e4f385da89cff535c8e5eb23ee3, classification: A known malicious address is involved in the transaction',
  features: ['A known malicious address is involved in the transaction'],
  source: 'api',
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
      RemoteFeatureFlagController: {
        ...confirmationRedesignRemoteFlagsState,
      },
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
          '0x1': {
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                url: 'https://mainnet.infura.io/v3/1234567890',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
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
          transactions: [
            { type: TransactionType.stakingDeposit },
          ],
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
          transactions: [
            { type: TransactionType.stakingUnstake },
          ],
        } as unknown as TransactionControllerState,
        AccountsController: {
          internalAccounts: {
            accounts: {
              '0x0000000000000000000000000000000000000000': {
                address: '0x0000000000000000000000000000000000000000',
              },
            },
            selectedAccount: '0x0000000000000000000000000000000000000000',
          },
        },
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
          transactions: [
            { type: TransactionType.stakingClaim },
          ],
        } as unknown as TransactionControllerState,
        AccountsController: {
          internalAccounts: {
            accounts: {
              '0x0000000000000000000000000000000000000000': {
                address: '0x0000000000000000000000000000000000000000',
              },
            },
            selectedAccount: '0x0000000000000000000000000000000000000000',
          },
        },
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
        { name: 'sigDeadline', type: 'uint256' }
      ],
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' }
      ],
    },
    domain: {
      name: 'Permit2',
      chainId: '1',
      version: '1',
      verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3'
    },
    primaryType: 'PermitBatch',
    message: {
      details: [
        {
          token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amount: '1461501637330902918203684832716283019655932542975',
          expiration: '1722887542',
          nonce: '5'
        },
        {
          token: '0xb0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amount: '250',
          expiration: '1722887642',
          nonce: '6'
        }
      ],
      spender: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
      sigDeadline: '1720297342'
    }
  }),
  [SignTypedDataMockType.DAI]: JSON.stringify({
    domain: {
      name: 'Dai Stablecoin',
      version: '1',
      chainId: 1,
      verifyingContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    },
    types: {
      EIP712Domain: mockTypeDefEIP712Domain,
      Permit: [
        { name: 'holder', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
        { name: 'allowed', type: 'bool' }
      ]
    },
    primaryType: 'Permit',
    message: {
      spender: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      tokenId: '3606393',
      nonce: 0,
      expiry: 0,
      allowed: false
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
            'c5067710-87cf-11ef-916c-71f266571322':
            mockSignatureRequest,
          },
        },
      },
    },
  };
}

const txId = '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998';
export const generateContractInteractionState = merge(
  {},
  stakingConfirmationBaseState,
  {
    engine: {
      backgroundState: {
        ApprovalController: {
          pendingApprovals: {
            [txId]: {
              id: txId,
              origin: 'metamask.github.io',
              type: 'transaction',
              time: 1731850822653,
              requestData: { 
                txId,
                from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477', 
                origin: 'metamask.github.io'
              },
              requestState: null,
              expectsResult: true,
            },
          },
          pendingApprovalCount: 1,
          approvalFlows: [],
        },
        TransactionController: {
          transactions: [
            { 
              type: 'contractInteraction', 
              id: txId,
              origin: 'metamask.github.io',
              time: 1731850822653,
              txParams: {
                data: '0x123456',
                from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
                gas: '0x1a5bd',
                maxFeePerGas: '0x84594b20',
                maxPriorityFeePerGas: '0x4dcd6500',
                to: '0x1234567890123456789012345678901234567890',
                value: '0x0',
                type: '0x2'
              },
              chainId: '0x1',
              networkClientId: 'mainnet',
              originalGasEstimate: '0x1a5bd',
              status: 'unapproved',
              defaultGasEstimates: {
                gas: '0x1a5bd',
                estimateType: 'medium',
                maxFeePerGas: '0x74594b20',
                maxPriorityFeePerGas: '0x1dcd6500'
              },
              gasFeeEstimates: {
                high: { maxFeePerGas: '0xd0f5f04a', maxPriorityFeePerGas: '0x77359400' },
                low: { maxFeePerGas: '0x274d76df', maxPriorityFeePerGas: '0x47be0d' },
                medium: { maxFeePerGas: '0x559ab26a', maxPriorityFeePerGas: '0x1dcd6500' },
                type: 'fee-market'
              }
            },
          ],
        } as unknown as TransactionControllerState,
      },
    },
  }
);

import {
  MessageParamsTyped,
  SignatureRequest,
  SignatureRequestStatus,
  SignatureRequestType,
} from '@metamask/signature-controller';
import { backgroundState } from './initial-root-state';
import { Hex } from '@metamask/utils';

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
        remoteFeatureFlags: {
          confirmation_redesign: {
            signatures: true,
          },
        },
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
        remoteFeatureFlags: {
          confirmation_redesign: {
            signatures: true,
          },
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
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmation_redesign: {
            signatures: true,
          },
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

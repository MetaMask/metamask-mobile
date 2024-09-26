import { backgroundState } from './initial-root-state';

export const personalSignatureConfirmationState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      ApprovalController: {
        pendingApprovals: {
          '76b33b40-7b5c-11ef-bc0a-25bce29dbc09': {
            id: '76b33b40-7b5c-11ef-bc0a-25bce29dbc09',
            origin: 'metamask.github.io',
            type: 'personal_sign',
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
    },
  },
};

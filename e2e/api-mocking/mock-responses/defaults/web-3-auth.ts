import { MockEventsObject } from '../../../framework';

const response = {
  nodeDetails: {
    currentEpoch: '1',
    torusNodeEndpoints: [
      'https://node-1.node.web3auth.io/sss/jrpc',
      'https://node-2.node.web3auth.io/sss/jrpc',
      'https://node-3.node.web3auth.io/sss/jrpc',
      'https://node-4.node.web3auth.io/sss/jrpc',
      'https://node-5.node.web3auth.io/sss/jrpc',
    ],
    torusNodeSSSEndpoints: [
      'https://node-1.node.web3auth.io/sss/jrpc',
      'https://node-2.node.web3auth.io/sss/jrpc',
      'https://node-3.node.web3auth.io/sss/jrpc',
      'https://node-4.node.web3auth.io/sss/jrpc',
      'https://node-5.node.web3auth.io/sss/jrpc',
    ],
    torusNodeRSSEndpoints: [
      'https://node-1.node.web3auth.io/rss',
      'https://node-2.node.web3auth.io/rss',
      'https://node-3.node.web3auth.io/rss',
      'https://node-4.node.web3auth.io/rss',
      'https://node-5.node.web3auth.io/rss',
    ],
    torusNodeTSSEndpoints: [
      'https://node-1.node.web3auth.io/tss',
      'https://node-2.node.web3auth.io/tss',
      'https://node-3.node.web3auth.io/tss',
      'https://node-4.node.web3auth.io/tss',
      'https://node-5.node.web3auth.io/tss',
    ],
    torusIndexes: [1, 2, 3, 4, 5],
    torusNodePub: [
      {
        X: 'e0925898fee0e9e941fdca7ee88deec99939ae9407e923535c4d4a3a3ff8b052',
        Y: '54b9fea924e3f3e40791f9987f4234ae4222412d65b74068032fa5d8b63375c1',
      },
      {
        X: '9124cf1e280aab32ba50dffd2de81cecabc13d82d2c1fe9de82f3b3523f9b637',
        Y: 'fca939a1ceb42ce745c55b21ef094f543b457630cb63a94ef4f1afeee2b1f107',
      },
      {
        X: '555f681a63d469cc6c3a58a97e29ebd277425f0e6159708e7c7bf05f18f89476',
        Y: '606f2bcc0884fa5b64366fc3e8362e4939841b56acd60d5f4553cf36b891ac4e',
      },
      {
        X: '2b5f58d8e340f1ab922e89b3a69a68930edfe51364644a456335e179bc130128',
        Y: '4b4daa05939426e3cbe7d08f0e773d2bf36f64c00d04620ee6df2a7af4d2247',
      },
      {
        X: '3ecbb6a68afe72cf34ec6c0a12b5cb78a0d2e83ba402983b6adbc5f36219861a',
        Y: 'dc1031c5cc8f0472bd521a62a64ebca9e163902c247bf05937daf4ae835091e4',
      },
    ],
  },
  success: true,
};

/**
 * Minimal mock data for Web3Auth API endpoints used in E2E testing.
 * Returns basic node details to prevent API failures.
 * For specific Web3Auth tests, add detailed mocks in the test files.
 */
export const WEB_3_AUTH_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        'https://api.web3auth.io/fnd-service/node-details?network=sapphire_mainnet&verifier=auth-connection-id&verifierId=user-id&keyType=secp256k1&sigType=ecdsa-secp256k1',
      responseCode: 200,
      response,
    },
    {
      urlEndpoint:
        'https://api.web3auth.io/fnd-service/node-details?network=sapphire_devnet&verifier=auth-connection-id&verifierId=user-id&keyType=secp256k1&sigType=ecdsa-secp256k1',
      responseCode: 200,
      response,
    },
  ],
};

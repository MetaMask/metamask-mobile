/**
 * Mock responses for ENS resolution in E2E tests.
 *
 * Intercepts the eth_call RPC requests that resolve vitalik.eth:
 * 1. ENS Registry → resolver address
 * 2. Resolver → supportsInterface (EIP-1577)
 * 3. Resolver → contenthash (IPFS CID)
 *
 * Also mocks the IPFS gateway fetch that validates + serves the resolved content.
 *
 * All hex values are pre-computed to avoid importing app dependencies.
 */

import type { Mockttp } from 'mockttp';
import type { TestSpecificMock } from '../../framework/types';
import { safeGetBodyText } from '../MockServerE2E';
import { getDecodedProxiedURL } from '../../smoke/notifications/utils/helpers';

// --- Pre-computed constants ---

// ENS Registry on mainnet
const ENS_REGISTRY = '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e';

// Mainnet public resolver (real address, used as our mock resolver)
const ENS_RESOLVER = '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41';

// Function selectors
const SELECTOR_RESOLVER = '0x0178b8bf'; // resolver(bytes32)
const SELECTOR_SUPPORTS_INTERFACE = '0x01ffc9a7'; // supportsInterface(bytes4)
const SELECTOR_CONTENTHASH = '0xbc1c58d1'; // contenthash(bytes32)

// Interface IDs checked by resolver.js
const INTERFACE_EIP1577 = 'bc1c58d1'; // contenthash support
const INTERFACE_LEGACY = 'd8389dc5'; // legacy content support

// ABI-encoded responses (pre-computed via ethers.utils.defaultAbiCoder)
// resolver(bytes32) → address
const RESOLVER_RESULT =
  '0x0000000000000000000000004976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41';

// supportsInterface → true
const SUPPORTS_TRUE =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

// supportsInterface → false
const SUPPORTS_FALSE =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

// contenthash(bytes32) → bytes (EIP-1577 encoded IPFS CID)
// Encodes CIDv0 QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4
// which decodes to CIDv1 base32: bafybeibj6lixxzqtsb45ysdjnupvqkufgdvzqbnvmhw2kf7cfkesy7r7d4
const CONTENTHASH_RESULT =
  '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000026e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f0000000000000000000000000000000000000000000000000000';

// The CIDv1 base32 that the app will compute after decoding the contenthash
const IPFS_CID = 'bafybeibj6lixxzqtsb45ysdjnupvqkufgdvzqbnvmhw2kf7cfkesy7r7d4';

// The IPFS gateway URL the app will construct and fetch
const GATEWAY_URL_PREFIX = `https://dweb.link/ipfs/${IPFS_CID}`;

// --- Fixture HTML content ---

const ENS_INDEX_HTML = `<!DOCTYPE html>
<html>
<head><title>vitalik.eth</title></head>
<body>
  <h1>vitalik.eth</h1>
  <nav>
    <a href="./categories/general.html">General</a>
  </nav>
</body>
</html>`;

const ENS_GENERAL_HTML = `<!DOCTYPE html>
<html>
<head><title>General</title></head>
<body><h1>General</h1></body>
</html>`;

// --- Mock implementation ---

interface EthCallParam {
  to?: string;
  data?: string;
}

interface JsonRpcRequest {
  id?: number;
  method?: string;
  params?: unknown[];
}

/**
 * Handles an eth_call request targeting ENS contracts.
 * Returns the appropriate ABI-encoded response or null if not an ENS call.
 */
function handleEnsEthCall(body: JsonRpcRequest): string | null {
  if (body.method !== 'eth_call') return null;

  const params = body.params as EthCallParam[] | undefined;
  const to = params?.[0]?.to?.toLowerCase();
  const data = params?.[0]?.data?.toLowerCase();

  if (!to || !data) return null;

  // Step 1: ENS Registry — resolver(bytes32)
  if (to === ENS_REGISTRY && data.startsWith(SELECTOR_RESOLVER)) {
    return RESOLVER_RESULT;
  }

  // Steps 2 & 3: Resolver contract
  if (to === ENS_RESOLVER) {
    // supportsInterface(bytes4)
    if (data.startsWith(SELECTOR_SUPPORTS_INTERFACE)) {
      // Check which interface is being queried (bytes after selector + padding)
      // The interfaceID is in the first 4 bytes of the first arg (bytes4 padded to 32 bytes)
      // data = 0x01ffc9a7 + 32-byte padded interfaceId
      // interfaceId starts at offset 10 (0x + 8 selector chars) for 8 hex chars
      const interfaceId = data.substring(10, 18);
      if (interfaceId === INTERFACE_EIP1577) return SUPPORTS_TRUE;
      if (interfaceId === INTERFACE_LEGACY) return SUPPORTS_FALSE;
      return SUPPORTS_FALSE;
    }

    // contenthash(bytes32)
    if (data.startsWith(SELECTOR_CONTENTHASH)) {
      return CONTENTHASH_RESULT;
    }
  }

  return null;
}

/**
 * TestSpecificMock that mocks the full ENS resolution chain for vitalik.eth
 * plus the IPFS gateway response serving local fixture HTML.
 */
export const ensResolutionMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Mock mainnet RPC eth_call requests through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      // Match mainnet Infura endpoints
      return url.includes('mainnet.infura.io');
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      try {
        const bodyText = await safeGetBodyText(request);
        if (!bodyText) {
          return {
            statusCode: 200,
            body: JSON.stringify({ id: 1, jsonrpc: '2.0', result: '0x' }),
          };
        }

        const body: JsonRpcRequest = JSON.parse(bodyText);
        const ensResult = handleEnsEthCall(body);

        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body.id ?? 1,
            jsonrpc: '2.0',
            result: ensResult ?? '0x',
          }),
        };
      } catch {
        return {
          statusCode: 200,
          body: JSON.stringify({ id: 1, jsonrpc: '2.0', result: '0x' }),
        };
      }
    });

  // Mock IPFS gateway — serves fixture HTML for the resolved CID.
  // Matches both the validation fetch() and WebView page load.
  // The default IPFS mocks only match #x-ipfs-companion-no-redirect URLs,
  // so this won't conflict.
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.startsWith(GATEWAY_URL_PREFIX);
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      const url = getDecodedProxiedURL(request.url);

      // Serve categories/general.html if the path matches
      if (url.includes('/categories/general.html')) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          body: ENS_GENERAL_HTML,
        };
      }

      // Default: serve the index page
      return {
        statusCode: 200,
        headers: { 'content-type': 'text/html' },
        body: ENS_INDEX_HTML,
      };
    });
};

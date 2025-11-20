/**
 * Mock response data for Polymarket UpNL (Unrealized Profit and Loss) API endpoints
 * Contains unrealized P&L data for E2E testing
 * Endpoint: /upnl?user
 */

import { PROXY_WALLET_ADDRESS } from './polymarket-constants';

export const POLYMARKET_UPNL_RESPONSE = [
  {
    user: PROXY_WALLET_ADDRESS,
    cashUpnl: -0.27623773652699946,
    percentUpnl: -3.002601222189568,
  },
];

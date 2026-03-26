/**
 * MYX PoC — Activate Broker Rebate
 *
 * Signs an EIP-712 message with the broker owner key and calls setUserFeeData
 * to link a user to the MetaMask broker with a rebate split.
 *
 * This is the critical step for MetaMask revenue from MYX trades.
 *
 * Usage:
 *   NETWORK=testnet yarn tsx activateBrokerRebate.ts
 *   NETWORK=testnet yarn tsx activateBrokerRebate.ts --rebate-pct 50 --referrer-pct 50
 *   NETWORK=testnet yarn tsx activateBrokerRebate.ts --dry-run
 *
 * Parameters:
 *   --rebate-pct N     Total % of protocol fee rebated (default: 50)
 *   --referrer-pct N   How much goes to broker vs trader (default: 50)
 *   --dry-run          Only generate signature, don't submit tx
 */

import { createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { lineaSepolia, arbitrumSepolia } from 'viem/chains';
import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
} from './common';
import type { TradeFlowItem } from '@myx-trade/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.myx.env') });

const DIVIDER = '='.repeat(72);

function getBrokerOwnerKey(chainId: number): { key: string; address: string } {
  if (chainId === 59141) {
    return {
      key: process.env.BROKER_OWNER_KEY_LINEA_SEPOLIA || '',
      address: process.env.BROKER_OWNER_ADDRESS_LINEA_SEPOLIA || '',
    };
  }
  if (chainId === 421614) {
    return {
      key: process.env.BROKER_OWNER_KEY_ARB_SEPOLIA || '',
      address: process.env.BROKER_OWNER_ADDRESS_ARB_SEPOLIA || '',
    };
  }
  throw new Error('No broker owner key for chainId ' + chainId);
}

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));
  const totalRebatePct = parseInt(args['rebate-pct'] || '50', 10);
  const referrerPct = parseInt(args['referrer-pct'] || '50', 10);
  const dryRun = process.argv.includes('--dry-run');

  console.log(DIVIDER);
  console.log('MYX Broker Rebate Activation');
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`User address: ${ADDRESS}`);
  console.log(`Broker address: ${config.brokerAddress}`);
  console.log(`Rebate config: totalReferralRebatePct=${totalRebatePct}, referrerRebatePct=${referrerPct}`);
  if (dryRun) console.log('DRY RUN — will generate signature but not submit tx');
  console.log(DIVIDER);

  // Get broker owner credentials
  const ownerCreds = getBrokerOwnerKey(config.chainId);
  if (!ownerCreds.key) {
    console.error('ERROR: No broker owner key found. Add BROKER_OWNER_KEY_* to .myx.env');
    process.exit(1);
  }
  console.log(`\nBroker owner: ${ownerCreds.address}`);

  // Initialize MYX client (as the user, not the owner)
  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Build the setUserFeeData parameters
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const nonce = '1'; // First-time setup

  const feeDataParams = {
    tier: 0,
    referrer: config.brokerAddress,
    totalReferralRebatePct: totalRebatePct,
    referrerRebatePct: referrerPct,
    nonce,
  };

  console.log('\nFee data params:');
  console.log(JSON.stringify(feeDataParams, null, 2));
  console.log(`Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`);

  // The contract expects an EIP-712 signature from the broker owner.
  // We need to figure out the exact domain and types the contract expects.
  // From the revert message, the contract function is:
  //   setUserFeeData((address user, uint64 nonce, uint64 deadline,
  //     (uint8 tier, address referrer, uint32 totalReferralRebatePct, uint32 referrerRebatePct),
  //     bytes signature))
  //
  // The signature likely covers: user, nonce, deadline, tier, referrer, rebatePcts
  // Let's try with the broker owner's private key

  const ownerAccount = privateKeyToAccount(('0x' + ownerCreds.key) as `0x${string}`);
  console.log(`\nOwner account derived: ${ownerAccount.address}`);
  if (ownerAccount.address.toLowerCase() !== ownerCreds.address.toLowerCase()) {
    console.error(`ERROR: Derived address ${ownerAccount.address} does not match expected ${ownerCreds.address}`);
    process.exit(1);
  }

  // Try EIP-712 typed data signature
  // Domain: likely the broker contract address
  // Domain name from on-chain contract: name() = "Metamask Broker"
  const domain = {
    name: 'Metamask Broker',
    chainId: config.chainId,
    verifyingContract: config.brokerAddress as `0x${string}`,
  };

  // Contract function signature from revert:
  //   setUserFeeData((address user, uint64 nonce, uint64 deadline,
  //     (uint8 tier, address referrer, uint32 totalReferralRebatePct, uint32 referrerRebatePct),
  //     bytes signature))
  // The inner tuple is a FeeData struct — EIP-712 needs nested type
  const types = {
    SetUserFeeData: [
      { name: 'user', type: 'address' },
      { name: 'nonce', type: 'uint64' },
      { name: 'deadline', type: 'uint64' },
      { name: 'feeData', type: 'FeeData' },
    ],
    FeeData: [
      { name: 'tier', type: 'uint8' },
      { name: 'referrer', type: 'address' },
      { name: 'totalReferralRebatePct', type: 'uint32' },
      { name: 'referrerRebatePct', type: 'uint32' },
    ],
  };

  const message = {
    user: ADDRESS as `0x${string}`,
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
    feeData: {
      tier: feeDataParams.tier,
      referrer: config.brokerAddress as `0x${string}`,
      totalReferralRebatePct: totalRebatePct,
      referrerRebatePct: referrerPct,
    },
  };

  console.log('\nEIP-712 domain:', JSON.stringify(domain, null, 2));
  console.log('EIP-712 message:', JSON.stringify(message, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  let signature: string;
  try {
    signature = await ownerAccount.signTypedData({
      domain,
      types,
      primaryType: 'SetUserFeeData',
      message,
    });
    console.log(`\nSignature generated: ${signature.slice(0, 20)}...${signature.slice(-10)}`);
  } catch (err) {
    console.error('\nFailed to generate EIP-712 signature:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDRY RUN complete. Signature generated but not submitted.');
    console.log(`Full signature: ${signature}`);
    client.close();
    return;
  }

  // Call setUserFeeData with the real signature
  console.log('\nCalling setUserFeeData on broker contract...');

  try {
    const result = await client.account.setUserFeeData(
      ADDRESS,
      config.chainId,
      deadline,
      feeDataParams,
      signature,
    );

    const code = (result as { code?: number }).code;
    if (code === 0) {
      console.log('\nSUCCESS! Broker rebate activated.');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\nNext steps:');
      console.log('  1. Place a trade to generate rebates');
      console.log('  2. Check trade history for referrerRebate > 0');
      console.log('  3. Call referrals.claimRebate() to withdraw');
    } else {
      const msg = (result as { message?: string }).message || 'unknown';
      console.log(`\nFailed with code=${code}: ${msg}`);
      console.log('\nThis likely means the EIP-712 domain/types don\'t match what the contract expects.');
      console.log('May need to check the contract ABI for the exact EIP-712 struct definition.');
      console.log('Full response:', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\nTransaction failed: ${msg}`);

    if (msg.includes('ECDSAInvalidSignature')) {
      console.log('\nThe EIP-712 domain or types don\'t match what the contract expects.');
      console.log('Need to inspect the broker contract ABI for the exact typed data structure.');
      console.log('Try: cast interface <broker-address> on the testnet explorer.');
    }
  }

  // Verify: check trade history for rebate fields
  console.log('\n' + DIVIDER);
  console.log('Post-activation: checking trade history for rebate fields...');

  try {
    const tradeFlowResp = await client.account.getTradeFlow(
      { limit: 3, chainId: config.chainId },
      ADDRESS,
    );
    const trades: TradeFlowItem[] = tradeFlowResp.code === 0 ? tradeFlowResp.data : [];
    if (trades.length > 0) {
      for (const t of trades) {
        console.log(`  orderId=${t.orderId}: referrerRebate=${t.referrerRebate}, referralRebate=${t.referralRebate}`);
      }
    } else {
      console.log('  No trades found');
    }
  } catch {
    console.log('  Failed to fetch trade history');
  }

  console.log('\n' + DIVIDER);
  console.log('Done.');
  client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

import { Router } from 'express';
import { asyncHandler } from '../util/async.ts';
import { kalshiFetch } from '../kalshi/client.ts';
import { requireUserCredential } from '../kalshi/userCredential.ts';
import { centsToDecimal, decimalToCents } from '../util/decimal.ts';

export const fundingRouter = Router();

/**
 * Canonical funding endpoints. The mobile remote adapter calls these to
 * produce canonical FundingPlan / FundingReceipt shapes.
 *
 *   POST /funding/deposit/prepare
 *     { externalUserId, amount, network='base' }
 *     → { kind: 'wallet_transfer', amount, network: 'eip155',
 *         settlementCurrency, request: { to, tokenMint, amount },
 *         venueReference: deposit_id,
 *         afterSubmit: { type: 'deposit_indication', required: true } }
 *
 *   POST /funding/deposit/submit
 *     { externalUserId, venueReference, txHash, amount? }
 *     → FundingReceipt { status, venueReference, amount }
 *
 *   POST /funding/withdraw/prepare
 *     { externalUserId, amount, destinationAddress, network='base' }
 *     → { kind: 'venue_api', operation: 'withdraw', amount,
 *         requestPreview: { network, destinationAddress, amount },
 *         venueReference?: payout_method_id }
 *
 *   POST /funding/withdraw/submit
 *     { externalUserId, amount, destinationAddress, network='base' }
 *     → FundingReceipt { status: 'submitted', venueReference: transfer_id }
 *
 * The withdraw flow hides the register-then-withdraw two-step in the backend:
 * /wallet/register is called once per (user, network, address) tuple, then we
 * call /withdraw/crypto.
 */

const NETWORK_BASE_DEFAULT = 'base';

const BASE_SEPOLIA_CHAIN_ID = '0xaa36a7'; // for display; Kalshi demo uses Stripe sandbox addresses
const USDC_BASE_SEPOLIA = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';

fundingRouter.post(
  '/deposit/prepare',
  asyncHandler(async (req, res) => {
    const { externalUserId, amount, network } = req.body ?? {};
    if (!externalUserId || !amount) {
      res.status(400).json({ error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + amount required' } });
      return;
    }
    const { user, credential } = requireUserCredential(externalUserId);
    const amountCents = decimalToCents(String(amount));
    const networks = [network ?? NETWORK_BASE_DEFAULT];

    const result = await kalshiFetch<{
      deposit_id: string;
      deposit_addresses: { network: string; address: string; token_currency: string; token_contract_address: string }[];
    }>({
      credential,
      method: 'POST',
      path: '/trade-api/v2/isv/deposit/crypto-addresses',
      body: { amount_cents: amountCents, networks },
    });

    const baseAddress = result.deposit_addresses.find((a) => a.network === networks[0]);
    if (!baseAddress) {
      res.status(500).json({ error: { code: 'VENUE_ERROR', message: 'no deposit address returned' } });
      return;
    }
    user.deposits[result.deposit_id] = {
      depositId: result.deposit_id,
      amountCents,
      network: baseAddress.network,
    };
    res.json({
      kind: 'wallet_transfer',
      venueId: 'kalshi',
      operation: 'deposit',
      network: 'eip155',
      amount: centsToDecimal(amountCents),
      settlementCurrency: { symbol: 'USDC', decimals: 6, tokenAddress: USDC_BASE_SEPOLIA, chainId: BASE_SEPOLIA_CHAIN_ID },
      request: {
        namespace: 'eip155',
        chainId: BASE_SEPOLIA_CHAIN_ID,
        to: baseAddress.address,
        data: '0x',
        value: '0x0',
      },
      venueReference: result.deposit_id,
      afterSubmit: { type: 'deposit_indication', required: true },
    });
  }),
);

fundingRouter.post(
  '/deposit/submit',
  asyncHandler(async (req, res) => {
    const { externalUserId, venueReference, txHash } = req.body ?? {};
    if (!externalUserId || !venueReference || !txHash) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + venueReference + txHash required' },
      });
      return;
    }
    const { user, credential } = requireUserCredential(externalUserId);
    const meta = user.deposits[venueReference];
    if (!meta) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'unknown deposit_id' } });
      return;
    }
    const indication = await kalshiFetch<{ status: string; prefunded_amount_cents?: number }>({
      credential,
      method: 'POST',
      path: '/trade-api/v2/isv/deposit/indication',
      body: { deposit_id: venueReference, tx_hash: txHash },
    });
    res.json({
      venueId: 'kalshi',
      operation: 'deposit',
      status: indication.status === 'prefunded' ? 'prefunded' : 'processing',
      amount: centsToDecimal(indication.prefunded_amount_cents ?? meta.amountCents),
      txHash,
      venueReference,
    });
  }),
);

fundingRouter.post(
  '/withdraw/prepare',
  asyncHandler(async (req, res) => {
    const { externalUserId, amount, destinationAddress, network } = req.body ?? {};
    if (!externalUserId || !amount || !destinationAddress) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + amount + destinationAddress required' },
      });
      return;
    }
    requireUserCredential(externalUserId);
    const net = network ?? NETWORK_BASE_DEFAULT;
    res.json({
      kind: 'venue_api',
      venueId: 'kalshi',
      operation: 'withdraw',
      amount,
      requestPreview: { network: net, destinationAddress, amount },
    });
  }),
);

fundingRouter.post(
  '/withdraw/submit',
  asyncHandler(async (req, res) => {
    const { externalUserId, amount, destinationAddress, network } = req.body ?? {};
    if (!externalUserId || !amount || !destinationAddress) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + amount + destinationAddress required' },
      });
      return;
    }
    const { user, credential } = requireUserCredential(externalUserId);
    const net = network ?? NETWORK_BASE_DEFAULT;
    const cacheKey = `${net}:${destinationAddress.toLowerCase()}`;
    let payoutMethodId = user.payoutMethods[cacheKey];

    if (!payoutMethodId) {
      // Optionally reuse a previously-registered method on the Kalshi side.
      const existing = await kalshiFetch<{
        payout_methods: { id: string; address: string; network: string }[];
      }>({
        credential,
        method: 'GET',
        path: '/trade-api/v2/isv/wallet/payout-methods',
      }).catch(() => ({ payout_methods: [] }));
      const match = existing.payout_methods.find(
        (m) => m.network === net && m.address.toLowerCase() === destinationAddress.toLowerCase(),
      );
      if (match) {
        payoutMethodId = match.id;
      } else {
        const registered = await kalshiFetch<{ payout_method_id: string }>({
          credential,
          method: 'POST',
          path: '/trade-api/v2/isv/wallet/register',
          body: { wallet_address: destinationAddress, network: net },
        });
        payoutMethodId = registered.payout_method_id;
      }
      user.payoutMethods[cacheKey] = payoutMethodId;
    }

    const withdrawal = await kalshiFetch<{ transfer_id: string }>({
      credential,
      method: 'POST',
      path: '/trade-api/v2/isv/withdraw/crypto',
      body: { amount_cents: decimalToCents(String(amount)), payout_method_id: payoutMethodId },
    });
    res.json({
      venueId: 'kalshi',
      operation: 'withdraw',
      status: 'submitted',
      amount,
      venueReference: withdrawal.transfer_id,
    });
  }),
);

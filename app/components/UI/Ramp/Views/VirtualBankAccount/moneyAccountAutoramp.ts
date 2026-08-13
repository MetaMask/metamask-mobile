import type { CreateAutorampRequest } from '@metamask/ramps-controller';
import {
  DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
  DEMO_AUTORAMP_DESTINATION_TOKEN,
  DEMO_AUTORAMP_SOURCE_CURRENCY_CODE,
} from './constants';

/**
 * Builds the demo autoramp request that converts a `BRL` Pix deposit into the
 * demo destination token and routes it to `address`.
 *
 * `customer_id` is deliberately absent: `RampsController.createAutoramp`
 * resolves it from KYC. The Ramps Dev API forwards the rest to MoonPay
 * unchanged, so the vocabulary and casing are MoonPay's.
 *
 * Single-sourced here so the manual "Create my account" pipeline
 * (`MockKycSuccess`) and the automated KYC-completion orchestrator stay in
 * lockstep.
 *
 * @param address - The wallet address the autoramp pays out to.
 * @returns The autoramp creation request body.
 */
export function buildMoneyAccountAutorampParams(
  address: string,
): CreateAutorampRequest {
  return {
    source_currencies: [
      { type: 'Fiat', code: DEMO_AUTORAMP_SOURCE_CURRENCY_CODE },
    ],
    destination_currency: {
      type: 'Crypto',
      token: DEMO_AUTORAMP_DESTINATION_TOKEN,
      blockchain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
    },
    recipient_account: {
      type: 'Crypto',
      chain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
      address,
    },
    source_is_third_party: false,
  };
}

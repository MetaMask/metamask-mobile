import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { isMnemonicMoneyAccount } from '../../../../../lib/Money/money-accounts';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { isMonadMainnetChainId } from '../../../../../util/networks';
import { isHardwareAccount } from '../../../../../util/address';
import {
  evmAddressFromEarningAddress,
  isClaimSubmittable,
  runEarningsClaim,
  submitClaimVoucher,
} from '../../../Rewards/utils/claimEarnings';
import type { ClaimVoucherDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';

export type CardCashbackClaimResult =
  | 'submitted'
  | 'submitted_stale'
  | 'failed'
  | 'skipped';

/**
 * Card cashback claim. Reuses the Rewards claim stack and only the
 * `card-cashback` route. An MPC Money account cannot sign the challenge.
 */
export function useCardCashbackClaim(onSubmitted?: () => Promise<void>) {
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const isSponsorshipEnabled = useSelector(getGasFeesSponsoredNetworkEnabled);
  const [isClaiming, setIsClaiming] = useState(false);
  const isClaimingRef = useRef(false);
  const softwareAccount =
    moneyAccount !== undefined && isMnemonicMoneyAccount(moneyAccount);
  const moneyAccountAddress = softwareAccount
    ? moneyAccount.address
    : undefined;
  const chainId = vaultConfig?.chainId;
  const submittable = isClaimSubmittable({
    moneyAccountAddress,
    chainId,
    isMonadMainnet: Boolean(chainId && isMonadMainnetChainId(chainId)),
    isSponsored: Boolean(chainId && isSponsorshipEnabled(chainId)),
  });

  const claim = useCallback(async (): Promise<CardCashbackClaimResult> => {
    if (
      !moneyAccountAddress ||
      !vaultConfig ||
      !submittable ||
      isClaimingRef.current
    ) {
      return 'skipped';
    }
    isClaimingRef.current = true;
    setIsClaiming(true);
    try {
      const outcomes = await runEarningsClaim({
        moneyAccountAddress,
        routes: ['card-cashback'],
        initiateClaim: async (route, body) =>
          Engine.context.RewardsMoneyController.initiateClaim(route, body),
        canSignEarningAddress: (earningAddress) => {
          const from = evmAddressFromEarningAddress(earningAddress);
          return Boolean(from) && !isHardwareAccount(from ?? '');
        },
        signMessage: async (message, earningAddress) => {
          const from = evmAddressFromEarningAddress(earningAddress);
          if (!from) throw new Error('SIGN_FAILED');
          const data = ('0x' +
            Buffer.from(message, 'utf8').toString('hex')) as Hex;
          try {
            return await Engine.context.KeyringController.signPersonalMessage({
              data,
              from,
            });
          } catch {
            throw new Error('SIGN_FAILED');
          }
        },
        submitVoucher: async (voucher: ClaimVoucherDto) => {
          await submitClaimVoucher({
            voucher,
            vaultConfig,
            moneyAccountAddress,
          });
        },
      });
      if (outcomes.some((outcome) => outcome.submitted)) {
        try {
          await onSubmitted?.();
        } catch {
          return 'submitted_stale';
        }
        return 'submitted';
      }
      return 'failed';
    } finally {
      isClaimingRef.current = false;
      setIsClaiming(false);
    }
  }, [moneyAccountAddress, onSubmitted, submittable, vaultConfig]);

  return {
    claim,
    isClaiming,
    canClaim: Boolean(vaultConfig) && submittable,
    mpcAccount: moneyAccount !== undefined && !softwareAccount,
  };
}

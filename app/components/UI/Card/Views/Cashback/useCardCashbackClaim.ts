import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { isMnemonicMoneyAccount } from '../../../../../lib/Money/money-accounts';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import {
  evmAddressFromEarningAddress,
  runEarningsClaim,
  submitClaimVoucher,
} from '../../../Rewards/utils/claimEarnings';
import { isHardwareAccount } from '../../../../../util/address';
import type { ClaimVoucherDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * Card cashback claim. Reuses the Rewards claim stack and only the
 * `card-cashback` route. An MPC Money account cannot sign the challenge.
 */
export function useCardCashbackClaim(onSubmitted?: () => Promise<void>) {
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const [isClaiming, setIsClaiming] = useState(false);
  const softwareAccount =
    moneyAccount !== undefined && isMnemonicMoneyAccount(moneyAccount);
  const moneyAccountAddress = softwareAccount ? moneyAccount.address : undefined;

  const claim = useCallback(async () => {
    if (!moneyAccountAddress || !vaultConfig || isClaiming) return;
    setIsClaiming(true);
    try {
      const outcomes = await runEarningsClaim({
        moneyAccountAddress,
        routes: ['card-cashback'],
        initiateClaim: (route, body) =>
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
              from: from as Hex,
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
        await onSubmitted?.();
      }
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, moneyAccountAddress, onSubmitted, vaultConfig]);

  return {
    claim,
    isClaiming,
    canClaim: Boolean(moneyAccountAddress),
    mpcAccount: moneyAccount !== undefined && !softwareAccount,
  };
}

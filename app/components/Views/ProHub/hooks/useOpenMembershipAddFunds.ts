import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  type Subscription,
} from '@metamask/subscription-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { useMoneyAccountDeposit } from '../../../UI/Money/hooks/useMoneyAccount';
import { navigateToMoneyAccountAccessNotice } from '../../../UI/Money/hooks/useMoneyAccountAvailability';
import { MoneyAccountAccessBlockedError } from '../../../UI/Money/utils/moneyAccountAccess';
import { getMembershipTopUpAmountUsd } from '../../shared/pro/membershipFundingAmount';

/**
 * Opens a membership top-up for the billed account's shortfall, the same
 * MetaMask Pay flow the join screen uses. Falls back to the Money funding
 * options when there is no shortfall or the balance check fails.
 *
 * @returns The Add funds action and its balance-check state.
 */
export function useOpenMembershipAddFunds() {
  const navigation = useNavigation<AppNavigationProp>();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const isCheckingBalanceRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const openAddFunds = useCallback(
    async (subscription: Subscription | undefined) => {
      if (isCheckingBalanceRef.current) {
        return;
      }

      let amount: string | undefined;
      if (subscription?.paymentMethod.type === PAYMENT_TYPES.byCrypto) {
        isCheckingBalanceRef.current = true;
        setIsCheckingBalance(true);
        try {
          const { hasSufficientBalance, balance, requiredBalance } =
            await Engine.context.SubscriptionDelegationService.checkMoneyAccountBalance(
              {
                product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
                recurringInterval: subscription.interval,
                payerAddress: subscription.paymentMethod.crypto.payerAddress,
              },
            );
          if (!hasSufficientBalance) {
            amount = getMembershipTopUpAmountUsd(balance, requiredBalance);
          }
        } catch (error) {
          Logger.error(
            ensureError(error, 'useOpenMembershipAddFunds.checkBalance'),
          );
        } finally {
          isCheckingBalanceRef.current = false;
          if (isMountedRef.current) {
            setIsCheckingBalance(false);
          }
        }
      }

      if (!isMountedRef.current || !navigation.isFocused()) {
        return;
      }

      if (amount === undefined) {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
        });
        return;
      }

      try {
        await initiateDeposit({
          amount,
          transactionType: TransactionType.membershipSubscription,
          forceBottomSheet: true,
        });
      } catch (error) {
        // Other failures already show a toast and are logged by initiateDeposit.
        if (error instanceof MoneyAccountAccessBlockedError) {
          navigateToMoneyAccountAccessNotice(navigation, error.reason);
        }
      }
    },
    [initiateDeposit, navigation],
  );

  return { openAddFunds, isCheckingBalance };
}

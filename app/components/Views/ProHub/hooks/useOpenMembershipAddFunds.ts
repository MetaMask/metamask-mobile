import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  type Subscription,
} from '@metamask/subscription-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { getMembershipTopUpAmountUsd } from '../../shared/membershipFundingAmount';

/**
 * Opens the Money funding options with a suggested top-up for the billed account.
 *
 * @returns The Add funds action and its balance-check state.
 */
export function useOpenMembershipAddFunds() {
  const navigation = useNavigation<AppNavigationProp>();
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

      if (isMountedRef.current && navigation.isFocused()) {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
          ...(amount !== undefined ? { params: { amount } } : {}),
        });
      }
    },
    [navigation],
  );

  return { openAddFunds, isCheckingBalance };
}

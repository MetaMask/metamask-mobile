import { TransactionType } from '@metamask/transaction-controller';
import { NavigationProp } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { useTransactionMetadataRequest } from '../hooks/useTransactionMetadataRequest';

const STANDALONE_TRANSACTION_CONFIRMATIONS: TransactionType[] = [
  TransactionType.stakingDeposit,
];

const STANDALONE_TRANSACTION_NAVIGATION_OPTS = {
  [TransactionType.stakingDeposit]: [
    'StakeScreens',
    {
      screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_DEPOSIT,
    },
  ],
};

export const useStandaloneConfirmation = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const isStandaloneConfirmation =
    STANDALONE_TRANSACTION_CONFIRMATIONS.includes(
      transactionMetadata?.type as TransactionType,
    );

  const navigationOpts = STANDALONE_TRANSACTION_NAVIGATION_OPTS[
    transactionMetadata?.type as keyof typeof STANDALONE_TRANSACTION_NAVIGATION_OPTS
  ] as unknown as [string, { screen: string }];

  return { isStandaloneConfirmation, navigationOpts };
};

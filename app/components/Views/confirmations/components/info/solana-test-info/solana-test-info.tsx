import React from 'react';
import { useSelector } from 'react-redux';
import { SolScope } from '@metamask/keyring-api';
import { getAssetsBalance } from '../../../../../../selectors/assets/assets-controller';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import useNavbar from '../../../hooks/ui/useNavbar';
import { SOLANA_TEST_AMOUNT_USDC } from '../../../utils/solana-test';
import { CustomAmountInfo } from '../custom-amount-info';

const SOLANA_NATIVE_ASSET_ID = `${SolScope.Mainnet}/slip44:501` as const;

export function SolanaTestInfo() {
  useNavbar('Solana Test');

  const solanaAccount = useSelector(selectSelectedInternalAccountByScope)(
    SolScope.Mainnet,
  );

  const assetsBalance = useSelector(getAssetsBalance);

  // The purchase gas is paid from this balance, not funded by MetaMask Pay.
  const solBalance =
    (solanaAccount &&
      assetsBalance[solanaAccount.id]?.[SOLANA_NATIVE_ASSET_ID]?.amount) ??
    '0';

  return (
    <CustomAmountInfo
      footerText={`Then: Solana test purchase · ${SOLANA_TEST_AMOUNT_USDC} USDC on Solana · Gas balance ${solBalance} SOL`}
    />
  );
}

import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import images from '../../../../../../../images/image-icons';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import Name from '../../../../../../UI/Name';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import InfoRow from '../../../../components/UI/info-row';
import InfoRowDivider from '../../../../components/UI/info-row-divider';
import styleSheet from './staking-contract-interaction-details.styles';
import { getFormattedAddressFromInternalAccount } from '../../../../../../../core/Multichain/utils';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';

const StakingContractInteractionDetails = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const address = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : '';

  return (
    <>
      {transactionMeta?.type === TransactionType.stakingDeposit && (
        <InfoRow label={strings('stake.staking_from')}>
          <Name
            type={NameType.EthereumAddress}
            value={(transactionMeta as TransactionMeta).txParams.from}
            variation={CHAIN_IDS.MAINNET}
          />
        </InfoRow>
      )}
      {transactionMeta?.type === TransactionType.stakingUnstake && (
        <InfoRow label={strings('stake.unstaking_to')}>
          <Name
            type={NameType.EthereumAddress}
            value={address as string}
            variation={CHAIN_IDS.MAINNET}
          />
        </InfoRow>
      )}
      {transactionMeta?.type === TransactionType.stakingClaim && (
        <InfoRow label={strings('stake.claiming_to')}>
          <Name
            type={NameType.EthereumAddress}
            value={address as string}
            variation={CHAIN_IDS.MAINNET}
          />
        </InfoRow>
      )}
      <InfoRow label={strings('confirm.label.interacting_with')}>
        <Name
          type={NameType.EthereumAddress}
          value={(transactionMeta as TransactionMeta).txParams.to as string}
          variation={CHAIN_IDS.MAINNET}
        />
      </InfoRow>
      <InfoRowDivider />
      <InfoRow label={strings('confirm.label.network')}>
        <View style={styles.networkContainer}>
          <Badge
            size={AvatarSize.Xs}
            imageSource={images.ETHEREUM}
            variant={BadgeVariant.Network}
            isScaled={false}
          />
          <Text>{'  '}</Text>
          <Text>{strings('stake.ethereum_mainnet')}</Text>
        </View>
      </InfoRow>
    </>
  );
};

export default StakingContractInteractionDetails;

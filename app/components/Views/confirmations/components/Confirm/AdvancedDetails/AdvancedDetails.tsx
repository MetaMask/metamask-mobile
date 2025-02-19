import { CHAIN_IDS, TransactionMeta } from '@metamask/transaction-controller';
import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import Badge, { BadgeVariant } from '../../../../../../component-library/components/Badges/Badge';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import images from '../../../../../../images/image-icons';
import Name from '../../../../../UI/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import { useTransactionMetadataRequest } from '../../../hooks/useTransactionMetadataRequest';
import InfoRow from '../../UI/InfoRow';
import InfoSectionAccordion from '../../UI/InfoSectionAccordion';
import InfoRowDivider from '../InfoRowDivider';
import styleSheet from './AdvancedDetails.styles';

const AdvancedDetails = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMeta = useTransactionMetadataRequest();

  return (
    <View style={styles.container}>
      <InfoSectionAccordion header={strings('stake.advanced_details')}>
        <InfoRow
          label={strings('confirm.staking_from')}
        >
          <Name
            type={NameType.EthereumAddress}
            value={(transactionMeta as TransactionMeta).txParams.from}
            variation={CHAIN_IDS.MAINNET}
          />
        </InfoRow>
        <InfoRow
          label={strings('confirm.label.interacting_with')}
        >
          <Name
            type={NameType.EthereumAddress}
            value={(transactionMeta as TransactionMeta).txParams.to as string}
            variation={CHAIN_IDS.MAINNET}
          />
        </InfoRow>
        <InfoRowDivider />
        <InfoRow
          label={strings('confirm.label.network')}
        >
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
      </InfoSectionAccordion>
    </View>
  );
};

export default AdvancedDetails;

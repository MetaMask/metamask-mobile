import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useStyles } from '../../../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { useTransferRecipient } from '../../../../hooks/transactions/useTransferRecipient';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import AlertRow from '../../../UI/info-row/alert-row';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import { strings } from '../../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import Identicon from '../../../../../../UI/Identicon';
import useDisplayName, {
  DisplayNameVariant,
} from '../../../../../../hooks/DisplayName/useDisplayName';
import { toFormattedAddress } from '../../../../../../../util/address';
import styleSheet from './from-to-row.styles';

interface AddressDisplayProps {
  address: string;
  chainId: string;
  label: React.ReactNode;
}

const AddressDisplay = ({ address, chainId, label }: AddressDisplayProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { name, image, variant } = useDisplayName({
    type: NameType.EthereumAddress,
    value: address,
    variation: chainId,
  });

  const displayText =
    variant === DisplayNameVariant.Unknown
      ? toFormattedAddress(address)
      : name || address;

  return (
    <View style={styles.addressRow}>
      <View style={styles.addressContent}>
        {label}
        <Text
          variant={TextVariant.BodyMD}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {displayText}
        </Text>
      </View>
      <Identicon
        address={address}
        imageUri={image}
        avatarSize={AvatarSize.Md}
        diameter={32}
      />
    </View>
  );
};

const FromToRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transferRecipient = useTransferRecipient();

  if (!transactionMetadata) {
    return null;
  }

  const { chainId, txParams } = transactionMetadata;
  const { from } = txParams;

  const fromAddress = from as string;
  const toAddress = transferRecipient;

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.FROM_TO}>
      <View style={styles.container}>
        <View style={styles.row}>
          <AddressDisplay
            address={fromAddress}
            chainId={chainId}
            label={
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.label}
              >
                {strings('transaction.from')}
              </Text>
            }
          />
        </View>

        <View style={[styles.row, styles.rowSeparator]}>
          <AddressDisplay
            address={toAddress as string}
            chainId={chainId}
            label={
              <View style={styles.labelRow}>
                <AlertRow
                  alertField={RowAlertKey.FromToAddress}
                  label={strings('send.to')}
                />
              </View>
            }
          />
        </View>
      </View>
    </InfoSection>
  );
};

export function FromToRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <InfoSection>
      <View style={styles.container}>
        <View style={styles.row}>
          <Skeleton
            width={110}
            height={32}
            style={styles.skeletonBorderRadiusLarge}
          />
        </View>
        <View style={[styles.row, styles.rowSeparator]}>
          <Skeleton
            width={110}
            height={32}
            style={styles.skeletonBorderRadiusLarge}
          />
        </View>
      </View>
    </InfoSection>
  );
}

export default FromToRow;

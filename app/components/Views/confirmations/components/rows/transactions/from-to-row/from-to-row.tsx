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
import { useAlerts } from '../../../../context/alert-system-context';
import InlineAlert from '../../../UI/inline-alert';
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
}

const AddressDisplay = ({ address, chainId }: AddressDisplayProps) => {
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
      <Text
        variant={TextVariant.BodyMD}
        numberOfLines={1}
        ellipsizeMode="middle"
        style={styles.addressText}
      >
        {displayText}
      </Text>
      <Identicon
        address={address}
        imageUri={image}
        avatarSize={AvatarSize.Sm}
        diameter={24}
      />
    </View>
  );
};

const FromToRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transferRecipient = useTransferRecipient();
  const { fieldAlerts } = useAlerts();
  const fromToAlert = fieldAlerts.find(
    (a) => a.field === RowAlertKey.FromToAddress,
  );

  if (!transactionMetadata) {
    return null;
  }

  const { chainId, txParams } = transactionMetadata;
  const { from } = txParams;

  const fromAddress = from as string;
  const toAddress = transferRecipient;

  const toAlert = fieldAlerts.find(
    (a) => a.field === RowAlertKey.FromToAddress,
  );

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.FROM_TO}>
      <View style={styles.container}>
        <View style={styles.row}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.label}
          >
            {strings('transaction.from')}
          </Text>
          <AddressDisplay address={fromAddress} chainId={chainId} />
        </View>

        <View style={[styles.row, styles.rowSeparator]}>
          <View style={styles.labelRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('send.to')}
            </Text>
            {toAlert && <InlineAlert alertObj={toAlert} />}
          </View>
          <AlertRow
            alertField={RowAlertKey.FromToAddress}
            hideInlineAlert={!!fromToAlert}
          >
            <AddressDisplay address={toAddress as string} chainId={chainId} />
          </AlertRow>
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

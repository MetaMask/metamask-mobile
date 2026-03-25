import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

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
import { TooltipModal } from '../../../UI/Tooltip';
import styleSheet from './from-to-row.styles';

interface AddressDisplayProps {
  address: string;
  displayText: string;
  image?: string;
  label: React.ReactNode;
  /** When true, tap opens a modal with the full raw address. */
  showAddressTooltipOnPress?: boolean;
}

const AddressDisplay = ({
  address,
  displayText,
  image,
  label,
  showAddressTooltipOnPress = false,
}: AddressDisplayProps) => {
  const { styles } = useStyles(styleSheet, {});
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const displayTextElement = (
    <Text variant={TextVariant.BodyMD} numberOfLines={1} ellipsizeMode="middle">
      {displayText}
    </Text>
  );

  return (
    <View style={styles.addressRow}>
      <View style={styles.addressContent}>
        {label}
        {showAddressTooltipOnPress ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setTooltipVisible(true)}
            >
              {displayTextElement}
            </Pressable>
            <TooltipModal
              open={tooltipVisible}
              setOpen={setTooltipVisible}
              content={address}
              title={displayText}
            />
          </>
        ) : (
          displayTextElement
        )}
      </View>
      <Identicon
        address={address}
        imageUri={image}
        avatarSize={AvatarSize.Lg}
      />
    </View>
  );
};

const FromToRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transferRecipient = useTransferRecipient();

  const fromAddress = (transactionMetadata?.txParams?.from as string) ?? '';
  const toAddress = transferRecipient ?? '';
  const chainId = transactionMetadata?.chainId ?? '';

  const {
    name: fromName,
    image: fromImage,
    subtitle: fromWalletName,
    variant: fromVariant,
  } = useDisplayName({
    type: NameType.EthereumAddress,
    value: fromAddress,
    variation: chainId,
  });

  const {
    name: toName,
    image: toImage,
    subtitle: toWalletName,
    variant: toVariant,
  } = useDisplayName({
    type: NameType.EthereumAddress,
    value: toAddress,
    variation: chainId,
  });

  if (!transactionMetadata) {
    return null;
  }

  const fromDisplayText =
    fromVariant === DisplayNameVariant.Unknown
      ? toFormattedAddress(fromAddress)
      : fromName || fromAddress;

  const toDisplayText =
    toVariant === DisplayNameVariant.Unknown
      ? toFormattedAddress(toAddress)
      : toName || toAddress;

  const fromLabel = fromWalletName
    ? `${strings('transaction.from')} ${fromWalletName}`
    : strings('transaction.from');

  const toLabel = toWalletName
    ? `${strings('send.to')} ${toWalletName}`
    : strings('send.to');

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.FROM_TO}>
      <View style={styles.container}>
        <View style={styles.row}>
          <AddressDisplay
            address={fromAddress}
            displayText={fromDisplayText}
            image={fromImage}
            label={
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.label}
              >
                {fromLabel}
              </Text>
            }
          />
        </View>

        <View style={[styles.row, styles.rowSeparator]}>
          <AddressDisplay
            address={toAddress as string}
            displayText={toDisplayText}
            image={toImage}
            showAddressTooltipOnPress
            label={
              <View style={styles.labelRow}>
                <AlertRow
                  alertField={RowAlertKey.FromToAddress}
                  label={toLabel}
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

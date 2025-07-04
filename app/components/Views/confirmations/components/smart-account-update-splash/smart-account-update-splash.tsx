import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Hex } from '@metamask/utils';
import { Image, Linking, View } from 'react-native';
import { JsonRpcError, serializeError } from '@metamask/rpc-errors';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import AvatarIcon from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarIcon';
import Engine from '../../../../../core/Engine';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { EIP5792ErrorCode } from '../../../../../constants/transaction';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import {
  selectSmartAccountOptIn,
  selectSmartAccountOptInForAccounts,
} from '../../../../../selectors/preferencesController';
import { isHardwareAccount } from '../../../../../util/address';
import { useTheme } from '../../../../../util/theme';
import Identicon from '../../../../UI/Identicon';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useStyles } from '../../../../hooks/useStyles';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { AccountSelection } from '../account-selection';
import styleSheet from './smart-account-update-splash.styles';

const ACCOUNT_UPGRADE_URL =
  'https://support.metamask.io/configure/accounts/what-is-a-smart-account';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const smartAccountUpdateImage = require('../../../../../images/smart-account-update.png');

const ListItem = ({
  iconName,
  title,
  description,
  styles,
}: {
  iconName: IconName;
  title: string;
  description: ReactElement;
  styles: ReturnType<typeof styleSheet>;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.listWrapper}>
      <AvatarIcon
        name={iconName}
        iconColor={colors.primary.default}
        backgroundColor={colors.primary.muted}
      />
      <View style={styles.textSection}>
        <Text variant={TextVariant.BodyMDBold}>{title}</Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {description}
        </Text>
      </View>
    </View>
  );
};

export const SmartAccountUpdateSplash = () => {
  const { PreferencesController } = Engine.context;
  const [acknowledged, setAcknowledged] = useState(false);
  const [isAccountSelectionVisible, setShowAccountSelection] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();
  const { ensByAccountAddress, evmAccounts: accounts } = useAccounts();
  const smartAccountOptInForAccounts = useSelector(
    selectSmartAccountOptInForAccounts,
  );
  const [selectedAddresses, setSelectedAddresses] = useState<Hex[]>(() => {
    if (smartAccountOptInForAccounts?.length) {
      return smartAccountOptInForAccounts;
    }
    return accounts.map(({ address }) => address as Hex);
  });
  const smartAccountOptIn = useSelector(selectSmartAccountOptIn);
  const {
    txParams: { from },
  } = transactionMetadata ?? { txParams: {} };
  const { styles } = useStyles(styleSheet, {});
  const { onReject } = useConfirmActions();

  useEffect(() => {
    if (selectedAddresses?.length === 0 && accounts?.length) {
      setSelectedAddresses(accounts.map(({ address }) => address as Hex));
    }
  }, [accounts, selectedAddresses, setSelectedAddresses]);

  const onUpgradeReject = useCallback(() => {
    const serializedError = serializeError(
      new JsonRpcError(
        EIP5792ErrorCode.RejectedUpgrade,
        'User rejected account upgrade',
      ),
    );

    onReject(serializedError as unknown as Error);
  }, [onReject]);

  const onConfirm = useCallback(() => {
    PreferencesController.setSmartAccountOptInForAccounts(selectedAddresses);
    setAcknowledged(true);
  }, [from, selectedAddresses, setAcknowledged, smartAccountOptInForAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const showAccountSelection = useCallback(() => {
    setShowAccountSelection(true);
  }, [setShowAccountSelection]);

  const hideAccountSelection = useCallback(() => {
    setShowAccountSelection(false);
  }, [setShowAccountSelection]);

  if (
    !transactionMetadata ||
    acknowledged ||
    (smartAccountOptIn && from && !isHardwareAccount(from)) ||
    smartAccountOptInForAccounts.includes(from as Hex)
  ) {
    return null;
  }

  if (isAccountSelectionVisible) {
    return (
      <AccountSelection
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        onClose={hideAccountSelection}
        selectedAddresses={selectedAddresses}
        setSelectedAddresses={setSelectedAddresses}
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      <ButtonIcon
        iconColor={IconColor.Default}
        iconName={IconName.Edit}
        onPress={showAccountSelection}
        size={ButtonIconSizes.Md}
        style={styles.edit}
        testID="open_account_selection"
      />
      <Image source={smartAccountUpdateImage} style={styles.image} />
      <Text variant={TextVariant.HeadingLG} style={styles.title}>
        {strings('confirm.7702_functionality.splashpage.splashTitle')}
      </Text>
      <View style={styles.requestSection}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('confirm.7702_functionality.splashpage.requestFor')}{' '}
        </Text>
        {selectedAddresses.map((address) => (
          <Identicon
            address={address}
            diameter={20}
            customStyle={styles.accountIcon}
          />
        ))}
      </View>
      <ListItem
        iconName={IconName.Speedometer}
        title={strings(
          'confirm.7702_functionality.splashpage.betterTransaction',
        )}
        description={strings(
          'confirm.7702_functionality.splashpage.betterTransactionDescription',
        )}
        styles={styles}
      />
      <ListItem
        iconName={IconName.Gas}
        title={strings('confirm.7702_functionality.splashpage.payToken')}
        description={strings(
          'confirm.7702_functionality.splashpage.payTokenDescription',
        )}
        styles={styles}
      />
      <ListItem
        iconName={IconName.Sparkle}
        title={strings('confirm.7702_functionality.splashpage.sameAccount')}
        description={
          <>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
              {strings(
                'confirm.7702_functionality.splashpage.featuresDescription',
              )}{' '}
              <Text
                color={TextColor.Primary}
                onPress={() => Linking.openURL(ACCOUNT_UPGRADE_URL)}
              >
                {strings('alert_system.upgrade_account.learn_more')}
              </Text>
            </Text>
          </>
        }
        styles={styles}
      />
      <View style={styles.buttonSection}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          style={styles.buttons}
          label={strings('confirm.7702_functionality.splashpage.reject')}
          onPress={onUpgradeReject}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          style={styles.buttons}
          label={strings('confirm.7702_functionality.splashpage.accept')}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
};

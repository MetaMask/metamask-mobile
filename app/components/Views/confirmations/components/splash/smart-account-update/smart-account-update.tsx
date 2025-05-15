import React, { ReactElement, useCallback, useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { JsonRpcError, serializeError } from '@metamask/rpc-errors';

import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Name from '../../../../../UI/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import { useStyles } from '../../../../../hooks/useStyles';
import { EIP5792ErrorCode } from '../../../constants/confirmations';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './smart-account-update.styles';

const ACCOUNT_UPGRADE_URL =
  'https://support.metamask.io/configure/accounts/what-is-a-smart-account';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const smartAccountUpdateImage = require('../../../../../../images/smart-account-update.png');

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
}) => (
  <View style={styles.listWrapper}>
    <Icon name={iconName} color={IconColor.Primary} />
    <View style={styles.textSection}>
      <Text variant={TextVariant.BodyMDBold}>{title}</Text>
      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
        {description}
      </Text>
    </View>
  </View>
);

export const SmartAccountUpdate = () => {
  const [acknowledged, setAcknowledged] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const { onReject } = useConfirmActions();

  const onUpgradeReject = useCallback(() => {
    const serializedError = serializeError(
      new JsonRpcError(
        EIP5792ErrorCode.RejectedUpgrade,
        'User rejected account upgrade',
      ),
    );

    onReject(serializedError as unknown as Error);
  }, []);

  if (!transactionMetadata || acknowledged) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Image source={smartAccountUpdateImage} style={styles.image} />
      <Text variant={TextVariant.HeadingLG} style={styles.title}>
        {strings('confirm.7702_functionality.splashpage.splashTitle')}
      </Text>
      <View style={styles.requestSection}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('confirm.7702_functionality.splashpage.requestFor')}{' '}
        </Text>
        <Name
          value={transactionMetadata.txParams.from}
          type={NameType.EthereumAddress}
          variation={transactionMetadata.chainId}
        />
      </View>
      <ListItem
        iconName={IconName.SpeedometerFilled}
        title={strings(
          'confirm.7702_functionality.splashpage.betterTransaction',
        )}
        description={strings(
          'confirm.7702_functionality.splashpage.betterTransactionDescription',
        )}
        styles={styles}
      />
      <ListItem
        iconName={IconName.PetrolPump}
        title={strings('confirm.7702_functionality.splashpage.payToken')}
        description={strings(
          'confirm.7702_functionality.splashpage.payTokenDescription',
        )}
        styles={styles}
      />
      <ListItem
        iconName={IconName.SparkleFilled}
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
                {strings('alert_system.upgarde_account.learn_more')}
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
          onPress={() => setAcknowledged(true)}
        />
      </View>
    </View>
  );
};

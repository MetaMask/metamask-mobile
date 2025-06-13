import React, { ReactElement, useCallback, useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { JsonRpcError, serializeError } from '@metamask/rpc-errors';
import { useDispatch, useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import { EIP5792ErrorCode } from '../../../../../constants/transaction';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import AvatarIcon from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarIcon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { upgradeSplashPageAcknowledgedForAccount } from '../../../../../actions/confirmations';
import Name from '../../../../UI/Name';
import { NameType } from '../../../../UI/Name/Name.types';
import { useTheme } from '../../../../../util/theme';
import { useStyles } from '../../../../hooks/useStyles';
import { selectUpgradeSplashPageAcknowledgedForAccounts } from '../../selectors/confirmation';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
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
  const [acknowledged, setAcknowledged] = useState(false);
  const dispatch = useDispatch();
  const transactionMetadata = useTransactionMetadataRequest();
  const upgradeSplashPageAcknowledgedForAccounts = useSelector(
    selectUpgradeSplashPageAcknowledgedForAccounts,
  );
  const {
    txParams: { from },
  } = transactionMetadata ?? { txParams: {} };
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
  }, [onReject]);

  const onConfirm = useCallback(() => {
    if (!from) {
      return;
    }
    dispatch(upgradeSplashPageAcknowledgedForAccount(from));
    setAcknowledged(true);
  }, [dispatch, from, setAcknowledged]);

  if (
    !transactionMetadata ||
    acknowledged ||
    upgradeSplashPageAcknowledgedForAccounts.includes(from as string)
  ) {
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

import React, { ReactElement } from 'react';
import { Hex } from '@metamask/utils';
import { Image, Linking, View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import AvatarIcon from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarIcon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import Identicon from '../../../../UI/Identicon';
import Name from '../../../../UI/Name';
import { NameType } from '../../../../UI/Name/Name.types';
import { useStyles } from '../../../../hooks/useStyles';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './smart-account-update-content.styles';

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

export const SmartAccountUpdateContent = ({
  selectedAddresses,
}: {
  selectedAddresses: Hex[];
}) => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId } = transactionMetadata ?? {};

  return (
    <>
      <Image source={smartAccountUpdateImage} style={styles.image} />
      <Text variant={TextVariant.HeadingLG} style={styles.title}>
        {strings('confirm.7702_functionality.splashpage.splashTitle')}
      </Text>
      {selectedAddresses?.length > 0 && (
        <View style={styles.requestSection}>
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('confirm.7702_functionality.splashpage.requestFor')}{' '}
          </Text>
          {selectedAddresses?.length === 1 && chainId ? (
            <Name
              type={NameType.EthereumAddress}
              value={selectedAddresses[0]}
              variation={chainId}
            />
          ) : (
            selectedAddresses?.map((address) => (
              <Identicon
                address={address}
                diameter={20}
                customStyle={styles.accountIcon}
              />
            ))
          )}
        </View>
      )}
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
                onPress={() =>
                  Linking.openURL(AppConstants.URLS.SMART_ACCOUNTS)
                }
              >
                {strings('alert_system.upgrade_account.learn_more')}
              </Text>
            </Text>
          </>
        }
        styles={styles}
      />
    </>
  );
};

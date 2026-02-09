import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../../../core/Multichain/utils';
import Name from '../../../../../UI/Name';
import { NameType } from '../../../../../UI/Name/Name.types';
import { EVM_SCOPE } from '../../../../../UI/Earn/constants/networks';
import { MERKL_CLAIM_CHAIN_ID } from '../../../../../UI/Earn/components/MerklRewards/constants';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row';
import InfoRowDivider from '../../UI/info-row-divider';
import { HeroRow } from '../../rows/transactions/hero-row';
import GasFeesDetailsRow from '../../rows/transactions/gas-fee-details-row';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import styleSheet from './musd-claim-info.styles';

export const MusdClaimInfo = () => {
  const { styles } = useStyles(styleSheet, {});

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const address = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : '';

  const { networkName, networkImage } = useNetworkInfo(MERKL_CLAIM_CHAIN_ID);

  return (
    <View testID={ConfirmationInfoComponentIDs.MUSD_CLAIM}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {strings('earn.claim_bonus')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.subtitle}
        >
          {strings('earn.claim_bonus_subtitle', {
            networkName: networkName ?? 'Linea',
          })}
        </Text>
      </View>
      <HeroRow />
      <InfoSection>
        <InfoRow label={strings('stake.claiming_to')}>
          <Name
            type={NameType.EthereumAddress}
            value={address as string}
            variation={MERKL_CLAIM_CHAIN_ID}
          />
        </InfoRow>
        <InfoRowDivider />
        <InfoRow label={strings('confirm.label.network')}>
          <View style={styles.networkContainer}>
            <Badge
              size={AvatarSize.Xs}
              imageSource={networkImage}
              variant={BadgeVariant.Network}
              isScaled={false}
            />
            <Text>{'  '}</Text>
            <Text>{networkName ?? 'Linea'}</Text>
          </View>
        </InfoRow>
      </InfoSection>
      <GasFeesDetailsRow disableUpdate />
    </View>
  );
};

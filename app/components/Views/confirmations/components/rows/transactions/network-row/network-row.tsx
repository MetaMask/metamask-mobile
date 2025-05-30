import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { selectNetworkConfigurationByChainId } from '../../../../../../../selectors/networkController';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { strings } from '../../../../../../../../locales/i18n';
import { RootState } from '../../../../../../../reducers';
import InfoSection from '../../../UI/info-row/info-section';
import InfoRow from '../../../UI/info-row/info-row';
import { MMM_ORIGIN } from '../../../../constants/confirmations';
import styleSheet from './network-row.styles';
import AvatarNetwork from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';

const NetworkRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const chainId = transactionMetadata?.chainId;
  const origin = transactionMetadata?.origin;
  const networkConfiguration = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
  const isDappOrigin = origin !== MMM_ORIGIN;
  const networkImage = getNetworkImageSource({ chainId: chainId as Hex });

  if (!transactionMetadata) {
    return null;
  }

  return (
    <InfoSection>
      <InfoRow
        label={strings('transactions.network')}
        style={styles.infoRowOverride}
      >
        <View style={styles.networkRowContainer}>
          {networkImage && (
            <AvatarNetwork
              size={AvatarSize.Xs}
              imageSource={networkImage}
              style={styles.avatarNetwork}
            />
          )}
          <Text variant={TextVariant.BodyMD}>{networkConfiguration?.name}</Text>
        </View>
      </InfoRow>

      {isDappOrigin && (
        <InfoRow
          label={strings('transactions.request_from')}
          style={styles.infoRowOverride}
        >
          <Text variant={TextVariant.BodyMD}>{origin}</Text>
        </InfoRow>
      )}
    </InfoSection>
  );
};

export default NetworkRow;

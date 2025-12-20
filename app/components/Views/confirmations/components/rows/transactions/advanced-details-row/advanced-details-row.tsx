import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../locales/i18n';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './advanced-details-row.styles';
import Routes from '../../../../../../../constants/navigation/Routes';

const AdvancedDetailsRow = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {
    isNonceChangeDisabled: false,
  });

  const handlePress = () => {
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.CONFIRMATIONS_ADVANCED_DETAILS,
    );
  };

  if (!transactionMetadata) {
    return null;
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <InfoSection>
        <AlertRow
          testID={ConfirmationRowComponentIDs.ADVANCED_DETAILS}
          alertField={RowAlertKey.InteractingWith}
          label={strings('stake.advanced_details')}
          style={styles.infoRowOverride}
          withIcon={{
            color: IconColor.Muted,
            size: IconSize.Sm,
            name: IconName.ArrowRight,
          }}
        />
      </InfoSection>
    </TouchableOpacity>
  );
};

export function AdvancedDetailsRowSkeleton() {
  const { styles } = useStyles(styleSheet, {
    isNonceChangeDisabled: false,
  });

  return (
    <InfoSection>
      <View style={styles.skeletonContainer}>
        <Skeleton width={130} height={20} style={styles.skeletonBorderRadius} />
        <Skeleton width={16} height={16} style={styles.skeletonBorderRadius} />
      </View>
    </InfoSection>
  );
}

export default AdvancedDetailsRow;

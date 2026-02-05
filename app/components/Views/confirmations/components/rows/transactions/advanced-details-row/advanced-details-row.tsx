import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { ScrollView } from 'react-native-gesture-handler';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../hooks/useStyles';
import Text from '../../../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../../../component-library/components/Texts/Text/Text.types';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useEditNonce } from '../../../../../../hooks/useEditNonce';
import Name from '../../../../../../UI/Name';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { selectSmartTransactionsEnabled } from '../../../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../../../reducers';
import { selectSmartTransactionsOptInStatus } from '../../../../../../../selectors/preferencesController';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../../../../hooks/ui/useFullScreenConfirmation';
import CustomNonceModal from '../../../../legacy/components/CustomNonceModal';
import { use7702TransactionType } from '../../../../hooks/7702/use7702TransactionType';
import Expandable from '../../../UI/expandable';
import InfoRow from '../../../UI/info-row';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import NestedTransactionData from '../../../nested-transaction-data/nested-transaction-data';
import SmartContractWithLogo from '../../../smart-contract-with-logo';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import Routes from '../../../../../../../constants/navigation/Routes';
import styleSheet from './advanced-details-row.styles';

const MAX_DATA_LENGTH_FOR_SCROLL = 200;

const AdvancedDetailsNavigationRow = () => {
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();

  const { styles } = useStyles(styleSheet, {
    isNonceChangeDisabled: false,
  });

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.FULL_SCREEN_CONFIRMATIONS.ADVANCED_DETAILS);
  }, [navigation]);

  if (!transactionMetadata) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      testID={ConfirmationRowComponentIDs.ADVANCED_DETAILS}
      activeOpacity={0.7}
    >
      <InfoSection>
        <AlertRow
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

const AdvancedDetailsExpandableRow = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const {
    setShowNonceModal,
    updateNonce,
    showNonceModal,
    proposedNonce,
    userSelectedNonce,
  } = useEditNonce();
  const { isBatched, isUpgrade, is7702transaction, isDowngrade } =
    use7702TransactionType();
  const isSTXEnabledForChain = useSelector((state: RootState) =>
    selectSmartTransactionsEnabled(state, transactionMetadata?.chainId),
  );
  const isSTXOptIn = useSelector((state: RootState) =>
    selectSmartTransactionsOptInStatus(state),
  );

  const isNonceChangeDisabled = isSTXEnabledForChain && isSTXOptIn;

  const { styles } = useStyles(styleSheet, {
    isNonceChangeDisabled,
  });

  const handleShowNonceModal = useCallback(() => {
    setShowNonceModal(true);
  }, [setShowNonceModal]);

  if (!transactionMetadata) {
    return null;
  }

  const data = transactionMetadata?.txParams?.data;
  const to = transactionMetadata?.txParams?.to;
  const hasDataNeedsScroll = data && data.length > MAX_DATA_LENGTH_FOR_SCROLL;
  const shouldShowData = !is7702transaction && data && data !== '0x';

  return (
    <>
      <Expandable
        testID={ConfirmationRowComponentIDs.ADVANCED_DETAILS}
        collapsedContent={
          <InfoSection>
            <AlertRow
              alertField={RowAlertKey.InteractingWith}
              label={strings('stake.advanced_details')}
              style={styles.infoRowOverride}
              withIcon={{
                color: IconColor.Muted,
                size: IconSize.Sm,
                name: IconName.ArrowDown,
              }}
            />
          </InfoSection>
        }
        expandedContent={
          <>
            {!isDowngrade && to && (
              <InfoSection>
                <AlertRow
                  alertField={RowAlertKey.InteractingWith}
                  label={strings('stake.interacting_with')}
                  disableAlertInteraction
                >
                  {isBatched || isUpgrade ? (
                    <SmartContractWithLogo />
                  ) : (
                    <Name
                      value={to}
                      type={NameType.EthereumAddress}
                      variation={transactionMetadata?.chainId as Hex}
                    />
                  )}
                </AlertRow>
              </InfoSection>
            )}
            <InfoSection>
              <InfoRow
                label={strings('transaction.custom_nonce')}
                tooltip={strings('transaction.custom_nonce_tooltip')}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  style={styles.nonceText}
                  onPress={
                    isNonceChangeDisabled ? undefined : handleShowNonceModal
                  }
                >
                  {userSelectedNonce}
                </Text>
              </InfoRow>
            </InfoSection>
            {shouldShowData && (
              <InfoSection>
                <InfoRow
                  label={strings('transaction.data')}
                  copyText={data}
                  valueOnNewLine
                >
                  {hasDataNeedsScroll ? (
                    <ScrollView
                      style={styles.dataScrollContainer}
                      testID="scroll-view-data"
                    >
                      <Text
                        // Keep this onPress to prevent the scroll view from being dismissed
                        // eslint-disable-next-line no-empty-function
                        onPress={() => {}}
                      >
                        {data}
                      </Text>
                    </ScrollView>
                  ) : (
                    data
                  )}
                </InfoRow>
              </InfoSection>
            )}
            {isBatched && <NestedTransactionData />}
            {showNonceModal && (
              <CustomNonceModal
                proposedNonce={proposedNonce}
                nonceValue={userSelectedNonce}
                close={() => setShowNonceModal(false)}
                save={updateNonce}
              />
            )}
          </>
        }
        expandedContentTitle={strings('stake.advanced_details')}
        isCompact
      />
    </>
  );
};

const AdvancedDetailsRow = () => {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();

  if (isFullScreenConfirmation) {
    return <AdvancedDetailsNavigationRow />;
  }

  return <AdvancedDetailsExpandableRow />;
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

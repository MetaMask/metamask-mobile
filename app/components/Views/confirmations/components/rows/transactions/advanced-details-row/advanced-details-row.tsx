import React from 'react';

import { ScrollView } from 'react-native-gesture-handler';
import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../locales/i18n';
import Text from '../../../../../../../component-library/components/Texts/Text/Text';
import {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text/Text.types';
import { useEditNonce } from '../../../../../../hooks/useEditNonce';
import { useStyles } from '../../../../../../hooks/useStyles';
import Name from '../../../../../../UI/Name';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import CustomNonceModal from '../../../../legacy/SendFlow/components/CustomNonceModal';
import { use7702TransactionType } from '../../../../hooks/7702/use7702TransactionType';
import Expandable from '../../../UI/expandable';
import InfoRow from '../../../UI/info-row';
import InfoSection from '../../../UI/info-row/info-section';
import NestedTransactionData from '../../../nested-transaction-data/nested-transaction-data';
import SmartContractWithLogo from '../../../smart-contract-with-logo';
import styleSheet from './advanced-details-row.styles';

const MAX_DATA_LENGTH_FOR_SCROLL = 200;

const AdvancedDetailsRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const {
    setShowNonceModal,
    setUserSelectedNonce,
    showNonceModal,
    proposedNonce,
    userSelectedNonce,
  } = useEditNonce();
  const { isBatched, isUpgrade, is7702transaction, isDowngrade } =
    use7702TransactionType();

  if (!transactionMetadata?.txParams?.to) {
    return null;
  }

  const data = transactionMetadata.txParams.data ?? '';
  const hasDataNeedsScroll = data.length > MAX_DATA_LENGTH_FOR_SCROLL;

  return (
    <>
      <Expandable
        testID={ConfirmationRowComponentIDs.ADVANCED_DETAILS}
        collapsedContent={
          <InfoSection>
            <InfoRow
              label={strings('stake.advanced_details')}
              style={styles.infoRowOverride}
              withIcon={{
                color: IconColor.Muted,
                size: IconSize.Sm,
                name: IconName.ArrowRight,
              }}
            />
          </InfoSection>
        }
        expandedContent={
          <>
            {!isDowngrade && (
              <InfoSection>
                <InfoRow label={strings('stake.interacting_with')}>
                  {isBatched || isUpgrade ? (
                    <SmartContractWithLogo />
                  ) : (
                    <Name
                      value={transactionMetadata.txParams.to}
                      type={NameType.EthereumAddress}
                      variation={transactionMetadata.chainId}
                    />
                  )}
                </InfoRow>
              </InfoSection>
            )}
            <InfoSection>
              <InfoRow
                label={strings('transaction.custom_nonce')}
                tooltip={strings('transaction.custom_nonce_tooltip')}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Primary}
                  style={styles.nonceText}
                  onPress={() => setShowNonceModal(true)}
                >
                  {userSelectedNonce}
                </Text>
              </InfoRow>
            </InfoSection>
            {!is7702transaction && (
              <InfoSection>
                <InfoRow
                  label={strings('transaction.data')}
                  copyText={transactionMetadata.txParams.data}
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
                save={(newNonce: number) => setUserSelectedNonce(newNonce)}
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

export default AdvancedDetailsRow;

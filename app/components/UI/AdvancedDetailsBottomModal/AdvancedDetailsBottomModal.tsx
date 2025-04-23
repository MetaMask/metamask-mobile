import React from 'react';
import { ConfirmationPageSectionsSelectorIDs } from '../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../locales/i18n';
import Text, { TextColor, TextVariant } from '../../../component-library/components/Texts/Text';
import { useEditNonce } from '../../hooks/useEditNonce';
import { useStyles } from '../../hooks/useStyles';
import ExpandableSection from '../../Views/confirmations/components/UI/expandable-section';
import InfoRow from '../../Views/confirmations/components/UI/info-row';
import InfoSection from '../../Views/confirmations/components/UI/info-row/info-section';
import { useTransactionMetadataRequest } from '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import CustomNonceModal from '../../Views/confirmations/legacy/SendFlow/components/CustomNonceModal';
import Name from '../Name';
import { NameType } from '../Name/Name.types';
import styleSheet from './AdvancedDetailsBottomModal.styles';


const AdvancedDetailsBottomSheet = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const {
    setShowNonceModal,
    setUserSelectedNonce,
    showNonceModal,
    proposedNonce,
    userSelectedNonce,
  } = useEditNonce();

  if (!transactionMetadata?.txParams?.to) {
    return null;
  }

  return (
    <>
      <ExpandableSection
        collapsedContent={
          <InfoSection>
            <InfoRow
              label={strings('stake.advanced_details')}
              isCompact
            />
          </InfoSection>
        }
        expandedContent={
          <>
            <InfoSection>
              <InfoRow label={strings('stake.interacting_with')}>
                <Name
                  value={transactionMetadata.txParams.to}
                  type={NameType.EthereumAddress}
                  variation={transactionMetadata.chainId}
                />
              </InfoRow>
            </InfoSection>
            <InfoSection>
              <InfoRow label={strings('transaction.custom_nonce')} tooltip={strings('transaction.custom_nonce_tooltip')}>
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
            <InfoSection>
              <InfoRow
                label={strings('transaction.data')}
                copyText={transactionMetadata.txParams.data}
                valueOnNewLine
              >
                {transactionMetadata.txParams.data}
              </InfoRow>
            </InfoSection>
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
        testID={ConfirmationPageSectionsSelectorIDs.ACCOUNT_NETWORK_SECTION}
        isCompact
      />
    </>
  );
};

export default AdvancedDetailsBottomSheet;

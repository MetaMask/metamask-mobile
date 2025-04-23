import React from 'react';
import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../locales/i18n';
import Text from '../../../../../../../component-library/components/Texts/Text/Text';
import { TextColor, TextVariant } from '../../../../../../../component-library/components/Texts/Text/Text.types';
import { useEditNonce } from '../../../../../../hooks/useEditNonce';
import { useStyles } from '../../../../../../hooks/useStyles';
import Name from '../../../../../../UI/Name';
import { NameType } from '../../../../../../UI/Name/Name.types';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import CustomNonceModal from '../../../../legacy/SendFlow/components/CustomNonceModal';
import ExpandableSection from '../../../UI/expandable-section';
import InfoRow from '../../../UI/info-row';
import InfoSection from '../../../UI/info-row/info-section';
import styleSheet from './advanced-details-row.styles';

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

export default AdvancedDetailsRow;

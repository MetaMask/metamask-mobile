import React, { useEffect, useState } from "react";
import { ConfirmationPageSectionsSelectorIDs } from "../../../../e2e/selectors/Confirmation/ConfirmationView.selectors";
import Text, { TextColor, TextVariant } from "../../../component-library/components/Texts/Text";
import { getNetworkNonce, updateTransaction } from "../../../util/transaction-controller";
import ExpandableSection from "../../Views/confirmations/components/UI/ExpandableSection";
import InfoRow from "../../Views/confirmations/components/UI/InfoRow";
import InfoSection from "../../Views/confirmations/components/UI/InfoRow/InfoSection";
import { useTransactionMetadataRequest } from "../../Views/confirmations/hooks/useTransactionMetadataRequest";
import CustomNonceModal from "../../Views/confirmations/legacy/SendFlow/components/CustomNonceModal";
import Name from "../Name";
import { NameType } from "../Name/Name.types";

const DEFAULT_PLACEHOLDER_NONCE_VALUE = 0;

const AdvancedDetailsBottomSheet = () => {
  const [showNonceModal, setShowNonceModal] = useState(false);
  const transactionMetadata = useTransactionMetadataRequest();

  const [proposedNonce, setProposedNonce] = useState<number>(DEFAULT_PLACEHOLDER_NONCE_VALUE);
  const [userSelectedNonce, setUserSelectedNonce] = useState<number>(DEFAULT_PLACEHOLDER_NONCE_VALUE);

  useEffect(() => {
    const getTransactionControllerNonce = async () => {
      if (!transactionMetadata) {
        return
      }

      const transactionControllerNonce = await getNetworkNonce(
        { from: transactionMetadata?.txParams.from },
        transactionMetadata.networkClientId
      );

      // This value is the initially proposed nonce value. It should not be
      // updated again, even if the transaction metadata nonce is updated by the
      // user.
      if (proposedNonce === DEFAULT_PLACEHOLDER_NONCE_VALUE) {
        setProposedNonce(transactionControllerNonce);
        setUserSelectedNonce(transactionControllerNonce);
      }
    }
    getTransactionControllerNonce();
  }, [transactionMetadata]);

  useEffect(() => {
    const updateTransactionControllerNonce = async () => {
      if (!transactionMetadata) {
        return;
      }

      const updatedTx = {
        ...transactionMetadata,
        customNonceValue: String(userSelectedNonce),
      };

      await updateTransaction(updatedTx, transactionMetadata.id);
    };
    updateTransactionControllerNonce();
  }, [userSelectedNonce]);

  if (!transactionMetadata || !transactionMetadata.txParams.to) {
    return null;
  }

  return (
    <>
      <ExpandableSection
        collapsedContent={
          <InfoSection>
            <InfoRow
              label="Advanced Details"
              isCompact
            />
          </InfoSection>
        }
        expandedContent={
          <>
            <InfoSection>
              <InfoRow label="Interacting with">
                <Name
                  value={transactionMetadata.txParams.to}
                  type={NameType.EthereumAddress}
                  variation={transactionMetadata.chainId}
                />
              </InfoRow>
            </InfoSection>
            <InfoSection>
              <InfoRow label="Nonce" tooltip="asdf">
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Primary}
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => setShowNonceModal(true)}
                >
                  {userSelectedNonce}
                </Text>
              </InfoRow>
            </InfoSection>
            <InfoSection>
              <InfoRow
                label="Data"
                tooltip="asdf"
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
        expandedContentTitle={"Advanced Details"}
        testID={ConfirmationPageSectionsSelectorIDs.ACCOUNT_NETWORK_SECTION}
        isCompact
      />
    </>
  );
};

export default AdvancedDetailsBottomSheet;

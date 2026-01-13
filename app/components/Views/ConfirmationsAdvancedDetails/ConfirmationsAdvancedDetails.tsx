import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView } from 'react-native';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../../../../locales/i18n';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';
import { useEditNonce } from '../../hooks/useEditNonce';
import { useStyles } from '../../hooks/useStyles';
import Name from '../../UI/Name';
import { NameType } from '../../UI/Name/Name.types';
import { IconColor } from '../../../component-library/components/Icons/Icon';
import { selectSmartTransactionsEnabled } from '../../../selectors/smartTransactionsController';
import { RootState } from '../../../reducers';
import { selectSmartTransactionsOptInStatus } from '../../../selectors/preferencesController';
import { useTransactionMetadataRequest } from '../confirmations/hooks/transactions/useTransactionMetadataRequest';
import CustomNonceModal from '../confirmations/legacy/SendFlow/components/CustomNonceModal';
import { use7702TransactionType } from '../confirmations/hooks/7702/use7702TransactionType';
import InfoRow from '../confirmations/components/UI/info-row';
import AlertRow from '../confirmations/components/UI/info-row/alert-row';
import { RowAlertKey } from '../confirmations/components/UI/info-row/alert-row/constants';
import InfoSection from '../confirmations/components/UI/info-row/info-section';
import NestedTransactionData from '../confirmations/components/nested-transaction-data/nested-transaction-data';
import SmartContractWithLogo from '../confirmations/components/smart-contract-with-logo';
import { getConfirmationsAdvancedDetailsNavbarOptions } from '../../UI/Navbar';
import styleSheet from './ConfirmationsAdvancedDetails.styles';

const MAX_DATA_LENGTH_FOR_SCROLL = 200;

const ConfirmationsAdvancedDetails = () => {
  const navigation = useNavigation();
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

  // Nonce is always editable unless smart transactions are enabled
  const isNonceChangeDisabled = isSTXEnabledForChain && isSTXOptIn;

  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {
    isNonceChangeDisabled,
  });

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getConfirmationsAdvancedDetailsNavbarOptions(
        'stake.advanced_details',
        navigation,
        colors,
      ),
    );
  }, [navigation, colors]);

  useLayoutEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const handleShowNonceModal = () => {
    setShowNonceModal(true);
  };

  if (!transactionMetadata) {
    return null;
  }

  const data = transactionMetadata?.txParams?.data;
  const to = transactionMetadata?.txParams?.to;
  const hasDataNeedsScroll = data && data.length > MAX_DATA_LENGTH_FOR_SCROLL;
  const shouldShowData = !is7702transaction && data && data !== '0x';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
          tooltipColor={IconColor.Alternative}
        >
          <Text
            variant={TextVariant.BodyMD}
            style={styles.nonceText}
            onPress={isNonceChangeDisabled ? undefined : handleShowNonceModal}
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
    </SafeAreaView>
  );
};

export default ConfirmationsAdvancedDetails;

import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { useEditNonce } from '../../../../hooks/useEditNonce';
import Name from '../../../../UI/Name';
import { NameType } from '../../../../UI/Name/Name.types';
import { selectSmartTransactionsEnabled } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';
import { selectSmartTransactionsOptInStatus } from '../../../../../selectors/preferencesController';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import CustomNonceModal from '../../legacy/components/CustomNonceModal';
import { use7702TransactionType } from '../../hooks/7702/use7702TransactionType';
import InfoRow from '../UI/info-row';
import AlertRow from '../UI/info-row/alert-row';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import InfoSection from '../UI/info-row/info-section';
import NestedTransactionData from '../nested-transaction-data/nested-transaction-data';
import SmartContractWithLogo from '../smart-contract-with-logo';

const MAX_DATA_LENGTH_FOR_SCROLL = 200;

const AdvancedDetailsPage = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { openTooltipModal } = useTooltipModal();
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

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['top', 'bottom']}
    >
      <Box twClassName="flex-1">
        <HeaderCenter
          title={strings('stake.advanced_details')}
          onBack={handleGoBack}
        />
        <ScrollView style={tw.style('flex-1 px-4')}>
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
              labelChildren={
                <ButtonIcon
                  testID="nonce-tooltip-button"
                  size={ButtonIconSizes.Sm}
                  iconColor={IconColor.Muted}
                  iconName={IconName.Info}
                  onPress={() =>
                    openTooltipModal(
                      strings('transaction.custom_nonce'),
                      strings('transaction.custom_nonce_tooltip'),
                    )
                  }
                />
              }
            >
              <Text
                variant={TextVariant.BodyMd}
                color={
                  isNonceChangeDisabled
                    ? TextColor.TextDefault
                    : TextColor.PrimaryDefault
                }
                twClassName={isNonceChangeDisabled ? '' : 'underline'}
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
                    style={tw.style('h-[200px]')}
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
        </ScrollView>
      </Box>
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

export default AdvancedDetailsPage;

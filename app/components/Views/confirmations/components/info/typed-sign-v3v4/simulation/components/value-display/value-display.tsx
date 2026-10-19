import React, { useCallback, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NetworkClientId } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import ButtonPill from '../../../../../../../../../component-library/components-temp/Buttons/ButtonPill/ButtonPill';

import { IndividualFiatDisplay } from '../../../../../../../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../../UI/SimulationDetails/formatAmount';

import Address from '../../../../../UI/info-row/info-value/address';

import Logger from '../../../../../../../../../util/Logger';
import { shortenString } from '../../../../../../../../../util/notifications/methods/common';
import { isNumberValue } from '../../../../../../../../../util/number';
import { useTheme } from '../../../../../../../../../util/theme';
import { calcTokenAmount } from '../../../../../../../../../util/transactions';

import { useGetTokenStandardAndDetails } from '../../../../../../hooks/useGetTokenStandardAndDetails';
import useTrackERC20WithoutDecimalInformation from '../../../../../../hooks/useTrackERC20WithoutDecimalInformation';
import { TOKEN_VALUE_UNLIMITED_THRESHOLD } from '../../../../../../utils/confirm';
import {
  isPermitDaiRevoke,
  isPermitDaiUnlimited,
} from '../../../../../../utils/signature';
import { TokenDetailsERC20 } from '../../../../../../utils/token';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
} from '@metamask/design-system-react-native';

import styleSheet from './value-display.styles';
import { strings } from '../../../../../../../../../../locales/i18n';
import AnimatedPulse from '../../../../../UI/animated-pulse';
import { selectContractExchangeRatesByChainId } from '../../../../../../../../../selectors/tokenRatesController';
import { RootState } from '../../../../../../../../../reducers';

interface SimulationValueDisplayParams {
  /** ID of the associated chain. */
  chainId: Hex;

  /** Header text to be displayed in the value modal */
  modalHeaderText: string;

  /** The network client ID */
  networkClientId?: NetworkClientId;

  /**
   * The ethereum token contract address. It is expected to be in hex format.
   * We currently accept strings since we have a patch that accepts a custom string
   * {@see .yarn/patches/@metamask-eth-json-rpc-middleware-npm-14.0.1-b6c2ccbe8c.patch}
   */
  tokenContract: Hex | string | undefined;

  // Optional

  /** Value for backwards compatibility DAI EIP-2612 support while it is being depreacted */
  allowed?: boolean | number | string;

  /** Whether a large amount can be substituted by "Unlimited" */
  canDisplayValueAsUnlimited?: boolean;

  /** True if value is being credited to wallet */
  credit?: boolean;

  /** True if value is being debited to wallet */
  debit?: boolean;

  /** The primaryType of the typed sign message */
  primaryType?: string;

  /** The tokenId for NFT */
  tokenId?: string;

  /** The token amount */
  value?: number | string;
}

const SimulationValueDisplay: React.FC<SimulationValueDisplayParams> = ({
  chainId,
  modalHeaderText,
  networkClientId,
  primaryType,
  tokenContract,
  tokenId,
  value,
  credit,
  debit,
  allowed,
  canDisplayValueAsUnlimited = false,
}) => {
  const [hasValueModalOpen, setHasValueModalOpen] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const theme = useTheme();

  const styles = styleSheet(theme);

  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId),
  );

  const exchangeRate =
    tokenContract && contractExchangeRates
      ? contractExchangeRates[tokenContract as `0x${string}`]?.price
      : undefined;

  const { details: tokenDetails, isPending: isPendingTokenDetails } =
    useGetTokenStandardAndDetails(tokenContract, networkClientId);
  const { decimalsNumber: tokenDecimals } = tokenDetails;

  useTrackERC20WithoutDecimalInformation(
    chainId,
    tokenContract,
    tokenDetails as TokenDetailsERC20,
  );

  /** Temporary error capturing as we are building out Permit Simulations */
  if (!tokenContract) {
    Logger.error(
      new Error(
        `SimulationValueDisplay: Token contract address is missing where primaryType === ${primaryType}`,
      ),
    );
    return null;
  }

  const isNFT = tokenId !== undefined && tokenId !== '0';
  const isDaiUnlimited = isPermitDaiUnlimited(tokenContract, allowed);
  const isDaiRevoke = isPermitDaiRevoke(tokenContract, allowed, value);
  const isRevoke =
    isDaiRevoke || modalHeaderText === strings('confirm.title.permit_revoke');

  const tokenAmount =
    isNumberValue(value) && !tokenId
      ? calcTokenAmount(value as number | string, tokenDecimals)
      : null;

  const isValidTokenAmount =
    !isNFT &&
    !isRevoke &&
    tokenAmount !== null &&
    tokenAmount !== undefined &&
    tokenAmount instanceof BigNumber;

  const fiatValue =
    isValidTokenAmount && exchangeRate && !tokenId
      ? tokenAmount.multipliedBy(exchangeRate)
      : undefined;

  const tokenValue = isValidTokenAmount
    ? formatAmount('en-US', tokenAmount)
    : null;

  const tokenValueMaxPrecision = isValidTokenAmount
    ? formatAmountMaxPrecision('en-US', tokenAmount)
    : null;

  const showUnlimitedValue =
    isDaiUnlimited ||
    (canDisplayValueAsUnlimited &&
      Number(value) > TOKEN_VALUE_UNLIMITED_THRESHOLD);

  // Avoid empty button pill container
  const showValueButtonPill = Boolean(
    isPendingTokenDetails ||
      showUnlimitedValue ||
      tokenValue !== null ||
      tokenId,
  );

  function handlePressTokenValue() {
    setHasValueModalOpen(true);
  }

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    setHasValueModalOpen(false);
  }, []);

  return (
    <View style={styles.wrapper}>
      <View style={styles.flexRowTokenValueAndAddress}>
        <View style={styles.valueAndAddress}>
          {showValueButtonPill && (
            <AnimatedPulse
              isPulsing={isPendingTokenDetails}
              minCycles={0}
              testID="simulation-value-display-loader"
            >
              <ButtonPill
                isDisabled={isNFT || tokenValueMaxPrecision === null}
                onPress={handlePressTokenValue}
                onPressIn={handlePressTokenValue}
                onPressOut={handlePressTokenValue}
                style={[
                  credit && styles.valueIsCredit,
                  debit && styles.valueIsDebit,
                ]}
              >
                {isPendingTokenDetails ? (
                  <View style={styles.loaderButtonPillEmptyContent} />
                ) : (
                  <Text>
                    {credit && '+ '}
                    {debit && '- '}
                    {showUnlimitedValue
                      ? strings('confirm.unlimited')
                      : tokenValue !== null &&
                        shortenString(tokenValue || '', {
                          truncatedCharLimit: 15,
                          truncatedStartChars: 15,
                          truncatedEndChars: 0,
                          skipCharacterInEnd: true,
                        })}
                    {tokenId && `#${tokenId}`}
                  </Text>
                )}
              </ButtonPill>
            </AnimatedPulse>
          )}
          <View style={styles.marginStart4}>
            <Address address={tokenContract} chainId={chainId} />
          </View>
        </View>
      </View>
      <View>
        {fiatValue &&
          (isPendingTokenDetails ? (
            <View style={styles.loadingFiatValue} />
          ) : (
            <IndividualFiatDisplay fiatAmount={fiatValue} />
          ))}
      </View>
      {hasValueModalOpen && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleRequestClose}
        >
          <BottomSheet
            ref={bottomSheetRef}
            keyboardAvoidingViewEnabled={false}
            onClose={handleSheetClosed}
          >
            <BottomSheetHeader onClose={handleRequestClose}>
              {modalHeaderText}
            </BottomSheetHeader>
            <Box twClassName="flex flex-col">
              <Text style={styles.valueModalText}>
                {tokenValueMaxPrecision}
              </Text>
            </Box>
          </BottomSheet>
        </Modal>
      )}
    </View>
  );
};

export default SimulationValueDisplay;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../../Views/confirmations/hooks/useApprovalRequest';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useMusdMaxConversion } from '../../../hooks/useMusdMaxConversion';
import {
  selectIsTransactionPayLoadingByTransactionId,
  selectTransactionPayTotalsByTransactionId,
} from '../../../../../../selectors/transactionPayController';
import { RootState } from '../../../../../../reducers';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { EarnNetworkAvatar } from '../../EarnNetworkAvatar';
import {
  MusdMaxConvertSheetProps,
  MusdMaxConvertSheetTestIds,
} from './MusdMaxConvertSheet.types';
import styleSheet from './MusdMaxConvertSheet.styles';
import { useStyles } from '../../../../../hooks/useStyles';

/**
 * Bottom sheet for quick max-amount mUSD conversion.
 *
 * This component:
 * 1. Creates a max-amount conversion transaction on mount
 * 2. Displays loading state while quotes are being fetched
 * 3. Shows fee and total information from TransactionPayController
 * 4. Uses useApprovalRequest hook for confirm/reject actions
 */
// TODO: Figure out why quotes can't be fetched for BSC tokens consistently.
const MusdMaxConvertSheet: React.FC<MusdMaxConvertSheetProps> = ({
  token,
  onClose,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const sheetRef = useRef<BottomSheetRef>(null);
  const networkName = useSelector(selectNetworkName);

  // TODO: Determine if we want to always use USD or if we want to use the user's selected currency.
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const [transactionId, setTransactionId] = useState<string | undefined>();
  const [creationError, setCreationError] = useState<string | null>(null);
  //   TODO: There's likely a better way to track this (e.g. listening to tx status changes from TransactionController).
  // Track if transaction was confirmed to avoid rejecting on sheet dismiss
  const isConfirmedRef = useRef(false);

  const {
    createMaxConversion,
    isLoading: isCreating,
    error: hookError,
  } = useMusdMaxConversion();
  const { onConfirm, onReject } = useApprovalRequest();

  // Selectors - only query when we have a transaction ID
  // TODO: Determine why we're defaulting to true here.
  const isQuoteLoading = useSelector((state: RootState) =>
    transactionId
      ? selectIsTransactionPayLoadingByTransactionId(state, transactionId)
      : true,
  );

  // TODO: There may be a more intuitive name instead of "totals".
  const totals = useSelector((state: RootState) =>
    transactionId
      ? selectTransactionPayTotalsByTransactionId(state, transactionId)
      : undefined,
  );

  // Derived state
  const isLoading = isCreating || isQuoteLoading;
  const error = creationError || hookError;
  const hasQuote = Boolean(totals?.total);

  // Format display values
  const totalUsd = totals?.total
    ? formatFiat(new BigNumber(totals.total.usd))
    : '';

  // Network fee = source network + target network fees (excludes provider fee per design)
  // TODO: Double-check fee accuracy.
  const networkFeeUsd = totals?.fees
    ? formatFiat(
        new BigNumber(totals.fees.sourceNetwork.estimate.usd).plus(
          totals.fees.targetNetwork.usd,
        ),
      )
    : '';

  // mUSD receive amount (1:1 stablecoin conversion, using the token balance)
  const mUsdAmount = token.balance ?? '0';

  // Create transaction on mount
  // TODO: "isMounted" seems janky. Consider using a different approach.
  useEffect(() => {
    let isMounted = true;

    const initializeConversion = async () => {
      try {
        const result = await createMaxConversion(token);
        if (isMounted) {
          setTransactionId(result.transactionId);
        }
      } catch (err) {
        if (isMounted) {
          setCreationError(
            err instanceof Error ? err.message : 'Failed to create conversion',
          );
        }
      }
    };

    initializeConversion();

    return () => {
      isMounted = false;
    };
  }, [token, createMaxConversion]);

  // Handle sheet dismiss (swipe, overlay tap, back button)
  // This ensures the transaction is rejected when the sheet is dismissed by any means
  // EXCEPT when the user confirmed (isConfirmedRef is true)
  const handleSheetDismiss = useCallback(() => {
    if (transactionId && !isConfirmedRef.current) {
      onReject();
    }
    onClose();
  }, [transactionId, onReject, onClose]);

  // Handle cancel button press
  const handleCancel = useCallback(() => {
    if (transactionId && !isConfirmedRef.current) {
      onReject();
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [onReject, transactionId]);

  // Handle confirm - approve the transaction and close
  const handleConfirm = useCallback(async () => {
    if (!transactionId || !hasQuote) {
      return;
    }

    try {
      await onConfirm();
      // Mark as confirmed so handleSheetDismiss doesn't reject
      isConfirmedRef.current = true;
      sheetRef.current?.onCloseBottomSheet();
    } catch (err) {
      // Error handling - the transaction might still be in flight
      setCreationError(
        err instanceof Error ? err.message : 'Failed to confirm conversion',
      );
    }
  }, [transactionId, hasQuote, onConfirm]);

  // Render loading state
  const renderLoading = () => (
    <View
      style={styles.loadingContainer}
      testID={MusdMaxConvertSheetTestIds.LOADING}
    >
      <ActivityIndicator size="large" color={colors.primary.default} />
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {/* TODO: Reassess this string later. */}
        {strings('earn.musd_conversion.fetching_quote')}
      </Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View
      style={styles.errorContainer}
      testID={MusdMaxConvertSheetTestIds.ERROR}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
        {error}
      </Text>
    </View>
  );

  // Render asset header with icon, symbol, and fiat amount
  const renderAssetHeader = () => (
    <View
      style={styles.assetHeader}
      testID={MusdMaxConvertSheetTestIds.ASSET_HEADER}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={getNetworkImageSource({
              chainId: token.chainId ?? '',
            })}
            isScaled={false}
            size={AvatarSize.Xs}
          />
        }
      >
        <EarnNetworkAvatar token={token} />
      </BadgeWrapper>
      <View style={styles.assetInfo}>
        <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {token.balanceInSelectedCurrency ?? token.balanceFiat ?? ''}
        </Text>
      </View>
    </View>
  );

  // Render quote details
  const renderQuoteDetails = () => (
    <View style={styles.contentContainer}>
      {/* Asset Header */}
      {renderAssetHeader()}

      {/* Details Section */}
      <View style={styles.detailsSection}>
        {/* You Receive Row */}
        <View
          style={styles.rowContainer}
          testID={MusdMaxConvertSheetTestIds.AMOUNT_ROW}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('earn.musd_conversion.you_receive')}
          </Text>
          {/* TODO: Replace mUSD hardcoded text with mUSD constant symbol */}
          <Text variant={TextVariant.BodyMDMedium}>{mUsdAmount} mUSD</Text>
        </View>

        {/* Network Fee Row */}
        <View
          style={styles.rowContainer}
          testID={MusdMaxConvertSheetTestIds.FEE_ROW}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('earn.musd_conversion.network_fee')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {networkFeeUsd}
          </Text>
        </View>

        {/* Total Row */}
        <View
          style={styles.rowContainer}
          testID={MusdMaxConvertSheetTestIds.TOTAL_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('confirm.label.total')}
          </Text>
          <Text variant={TextVariant.BodyMDMedium}>{totalUsd}</Text>
        </View>

        {/* Earning Row */}
        <View
          style={styles.rowContainer}
          testID={MusdMaxConvertSheetTestIds.EARNING_ROW}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('earn.musd_conversion.earning')}
          </Text>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Success}>
            {/* TODO: Replace hardcoded 2% with constant at very least until we have actual yield data. */}
            2%
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    // TODO: Fix background not covering entire view. This may be fixed by breaking out the MusdMaxConvertSheet into a separate route.
    <BottomSheet
      ref={sheetRef}
      onClose={handleSheetDismiss}
      shouldNavigateBack={false}
    >
      <BottomSheetHeader onClose={handleCancel}>
        {strings('earn.musd_conversion.convert_to_musd')}
      </BottomSheetHeader>

      <View
        style={styles.container}
        testID={MusdMaxConvertSheetTestIds.CONTAINER}
      >
        {error
          ? renderError()
          : isLoading
            ? renderLoading()
            : renderQuoteDetails()}
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.button}>
          <Button
            onPress={handleConfirm}
            label={strings('earn.musd_conversion.convert')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            isDisabled={isLoading || !hasQuote || Boolean(error)}
            testID={MusdMaxConvertSheetTestIds.CONFIRM_BUTTON}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default MusdMaxConvertSheet;

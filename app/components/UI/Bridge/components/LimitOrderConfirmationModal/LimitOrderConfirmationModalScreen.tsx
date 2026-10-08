import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { formatChainIdToDec } from '@metamask/bridge-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import Logger from '../../../../../util/Logger';
import {
  selectLimitOrderCostTolerance,
  selectLimitOrderMarketComparison,
} from '../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { useFetchLimitOrdersDelegations } from '../../api/limitOrders/getDelegations';
import type { LimitOrderDelegationsResponse } from '../../api/limitOrders/getDelegations/schema';
import { useCreateLimitOrder } from '../../api/limitOrders/create';
import type { SignedLimitOrderDelegation } from '../../api/limitOrders/create/schema';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import { signLimitOrderDelegations } from '../../utils/limitOrders/signLimitOrderDelegations';
import { LimitOrderConfirmationModal } from './LimitOrderConfirmationModal';
import type { LimitOrderConfirmationModalParams } from './types';
import { strings } from '../../../../../../locales/i18n';

/**
 * What went wrong on the last confirm attempt. Each one reads differently in
 * the banner, since "we never asked for an order" and "the order was rejected"
 * are not the same thing to a user about to try again.
 */
enum LimitOrderConfirmError {
  MissingTrigger = 'missingTrigger',
  Delegations = 'delegations',
  Signature = 'signature',
  Create = 'create',
}

const CONFIRM_ERROR_MESSAGE_KEY: Record<LimitOrderConfirmError, string> = {
  [LimitOrderConfirmError.MissingTrigger]:
    'bridge.limit.error_missing_trigger_price',
  [LimitOrderConfirmError.Delegations]:
    'bridge.limit.error_fetching_delegations',
  [LimitOrderConfirmError.Signature]: 'bridge.limit.error_signing_delegations',
  [LimitOrderConfirmError.Create]: 'bridge.limit.error_creating_order',
};

const USD_CURRENCY = 'usd';

export const LimitOrderConfirmationModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<LimitOrderConfirmationModalParams>();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const triggerComparison = useSelector(selectLimitOrderMarketComparison);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const delegationFee = useEIP7702UpgradeFee();
  const sourceChainId = params.sourceToken?.chainId;
  const feeToken = useMemo(
    () => (sourceChainId ? getNativeSourceToken(sourceChainId) : undefined),
    [sourceChainId],
  );

  // A price entered in fiat is sent as its USD equivalent, which only matches
  // what is on screen when the display currency is already USD. Reading it off
  // the trigger shows exactly the price the order is placed at. A ratio trigger
  // is priced in the counter token, so no exchange rate is involved.
  const { trigger } = params;
  const usdTriggerPrice = useMemo(() => {
    if (
      !trigger ||
      trigger.kind === 'ratio' ||
      currentCurrency?.toLowerCase() === USD_CURRENCY
    ) {
      return undefined;
    }

    return `${getCurrencySymbol(USD_CURRENCY)}${formatAmountWithLocaleSeparators(
      trigger.price,
    )}`;
  }, [currentCurrency, trigger]);

  const [confirmError, setConfirmError] = useState<LimitOrderConfirmError>();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  // The tolerance the delegations are requested with. The create request has to
  // be given the same one, so both read this single resolved value.
  const costTolerancePercent =
    costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE;
  const { fetchLimitOrdersDelegations } = useFetchLimitOrdersDelegations({
    ...params.order,
    costTolerance: costTolerancePercent,
  });
  const createLimitOrder = useCreateLimitOrder();

  const error = useMemo(() => {
    if (delegationFee.status === 'error') {
      return {
        bannerMessage: strings('bridge.limit.error_calculation_network_fees'),
        primaryButtonLabel: strings('bridge.limit.try_again'),
      };
    }

    if (confirmError) {
      return {
        bannerMessage: strings(CONFIRM_ERROR_MESSAGE_KEY[confirmError]),
        primaryButtonLabel: strings('bridge.limit.try_again'),
      };
    }
  }, [delegationFee, confirmError]);

  const handleConfirm = useCallback(async () => {
    if (delegationFee.status === 'error') {
      delegationFee.retry();
      return;
    }

    setConfirmError(undefined);

    // Nothing here can reconstruct the trigger: the raw limit price lives on
    // the limit order screen. Failing in the banner beats sending an order
    // whose fill condition we would have had to guess.
    if (!params.trigger) {
      setConfirmError(LimitOrderConfirmError.MissingTrigger);
      return;
    }

    setIsCreatingOrder(true);

    // A retry starts over from the delegations, which hands back the same
    // `clientOrderId` for these order params. The API treats that id as
    // idempotent, so retrying a create whose response never arrived cannot
    // place the order twice.
    let delegationsResponse: LimitOrderDelegationsResponse;
    try {
      delegationsResponse = await fetchLimitOrdersDelegations();
    } catch (fetchError) {
      Logger.error(
        fetchError as Error,
        'LimitOrderConfirmationModalScreen: Failed to fetch limit order delegations',
      );
      setConfirmError(LimitOrderConfirmError.Delegations);
      setIsCreatingOrder(false);
      return;
    }

    // The API issues the delegations unsigned and will not accept them back
    // that way: the delegator's signature is what authorises the fill.
    let signedDelegations: SignedLimitOrderDelegation[];
    try {
      signedDelegations = await signLimitOrderDelegations(
        delegationsResponse.delegations,
      );
    } catch (signatureError) {
      Logger.error(
        signatureError as Error,
        'LimitOrderConfirmationModalScreen: Failed to sign limit order delegations',
      );
      setConfirmError(LimitOrderConfirmError.Signature);
      setIsCreatingOrder(false);
      return;
    }

    try {
      await createLimitOrder({
        // Echoed back by the delegations request, so both calls are tied to the
        // same order id without having to thread it through separately.
        clientOrderId: delegationsResponse.order.clientOrderId,
        // The delegations response reports the chain as CAIP-2 (`eip155:56`);
        // the create request takes it in decimal (`56`).
        chainId: formatChainIdToDec(delegationsResponse.chainId),
        trigger: params.trigger,
        // Bookkeeping only, and explicitly the amount as requested rather than
        // the one the tolerance was applied to: the enforceable floor is the
        // one in the signed caveat.
        requestedDestAmount: params.order.destAmount,
        // Must match the tolerance the delegations were requested with, since
        // that is what set the slippage budget of the fill quote. It is a
        // percent, i.e. `2.5` means 2.5%.
        priceTolerance: Number(costTolerancePercent),
        // As issued by the delegations request, `typedData` included, with only
        // the delegator's signature filled in: the API verifies each signature
        // against exactly the delegation it issued.
        delegations: signedDelegations,
      });
    } catch (createError) {
      Logger.error(
        createError as Error,
        'LimitOrderConfirmationModalScreen: Failed to create limit order',
      );
      setConfirmError(LimitOrderConfirmError.Create);
      return;
    } finally {
      setIsCreatingOrder(false);
    }

    // The order is placed, so the sheet has nothing left to confirm.
    navigation.goBack();
    toast({
      severity: ToastSeverity.Success,
      title: strings('bridge.limit.order_created_title'),
      description: strings('bridge.limit.order_created_description'),
      showCloseButton: false,
    });
  }, [
    createLimitOrder,
    delegationFee,
    fetchLimitOrdersDelegations,
    navigation,
    params.order.destAmount,
    params.trigger,
    costTolerancePercent,
  ]);

  return (
    <LimitOrderConfirmationModal
      {...params}
      triggerComparison={triggerComparison}
      delegationFee={delegationFee}
      feeToken={feeToken}
      usdTriggerPrice={usdTriggerPrice}
      costTolerance={`${costTolerancePercent}%`}
      goBack={navigation.goBack}
      error={error?.bannerMessage}
      primaryButton={{
        onPress: handleConfirm,
        label:
          error?.primaryButtonLabel ?? strings('bridge.limit.confirm_order'),
        isLoading: delegationFee.status === 'loading' || isCreatingOrder,
      }}
    />
  );
};

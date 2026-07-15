import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxJustifyContent,
  ButtonSize,
  ButtonsAlignment,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Engine from '../../../../../core/Engine';
import {
  incrementBridgeBalanceRefreshKey,
  setDestAmount,
  setDestToken,
  setIsDestTokenManuallySet,
  setSelectedQuoteRequestId,
  setSourceAmount,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import { formatSecondaryTokenAmount } from '../../utils/sourceAmountInputMode';
import {
  PostTradeBottomSheetParams,
  PostTradeStatus,
} from './PostTradeBottomSheet.types';
import type { BridgeToken } from '../../types';
import styleSheet from './PostTradeBottomSheet.styles';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { PostTradeTokenSuggestions } from './PostTradeTokenSuggestions';
import {
  convertApiTokenToBridgeToken,
  getDefaultDestToken,
  getNativeSourceToken,
  isSameBridgeToken,
} from '../../utils/tokenUtils';
import { getTrendingTokenImageUrl } from '../../../Trending/utils/getTrendingTokenImageUrl';
import { PostTradeBottomSheetTestIds } from './PostTradeBottomSheet.testIds';
import {
  hidePostTradeNotificationSurface,
  showPostTradeNotificationSurface,
} from '../../utils/postTradeNotifications';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getAnalyticsStatus,
  getPostTradeSharedAnalyticsProperties,
  type PostTradeAnalyticsCta,
} from './PostTradeBottomSheet.analytics';

export const getTradeSubtitle = ({
  sourceAmount,
  destAmount,
  sourceToken,
  destToken,
}: Pick<
  PostTradeBottomSheetParams,
  'sourceAmount' | 'destAmount' | 'sourceToken' | 'destToken'
>) => {
  if (
    !sourceAmount ||
    !destAmount ||
    !sourceToken?.symbol ||
    !destToken?.symbol
  ) {
    return undefined;
  }

  const sourceAmountDisplay =
    formatSecondaryTokenAmount(sourceAmount) ?? sourceAmount;
  const destAmountDisplay =
    formatSecondaryTokenAmount(destAmount) ?? destAmount;

  return strings('bridge.post_trade_modal.trade_subtitle', {
    sourceAmount: formatAmountWithLocaleSeparators(sourceAmountDisplay),
    sourceSymbol: sourceToken.symbol,
    destAmount: formatAmountWithLocaleSeparators(destAmountDisplay),
    destSymbol: destToken.symbol,
  });
};

const StatusIcon = ({ status }: { status: PostTradeStatus }) => {
  if (status !== PostTradeStatus.InProgress) {
    const isSuccess = status === PostTradeStatus.Success;

    return (
      <AvatarIcon
        iconName={isSuccess ? IconName.CheckBold : IconName.Error}
        severity={
          isSuccess ? AvatarIconSeverity.Success : AvatarIconSeverity.Danger
        }
        size={AvatarIconSize.Xl}
      />
    );
  }

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      backgroundColor={BoxBackgroundColor.PrimaryMuted}
      twClassName="h-12 w-12 rounded-full"
    >
      <Spinner
        color={IconColor.PrimaryDefault}
        spinnerIconProps={{
          size: IconSize.Xl,
        }}
      />
    </Box>
  );
};

export const PostTradeBottomSheet = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasRefreshedBalancesRef = useRef(false);
  const hasTrackedViewedRef = useRef(false);
  const modalOpenedAtRef = useRef(Date.now());
  const shouldSkipDismissedTrackingRef = useRef(false);
  const { styles } = useStyles(styleSheet, {});
  const params = useParams<PostTradeBottomSheetParams>();
  const updateQuoteParams = useBridgeQuoteRequest();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isBridge =
    params.sourceToken?.chainId &&
    params.destToken?.chainId &&
    params.sourceToken.chainId !== params.destToken.chainId;
  const sharedAnalyticsProperties = useMemo(
    () => getPostTradeSharedAnalyticsProperties(params),
    [params],
  );

  const status = usePostTradeTxStatus({
    initialStatus: params.status,
    isBridge: Boolean(isBridge),
    transactionMetaId: params.transactionMetaId,
    transactionHash: params.transactionHash,
  });

  const getTimeModalOpenMs = useCallback(
    () => Date.now() - modalOpenedAtRef.current,
    [],
  );

  useEffect(() => {
    showPostTradeNotificationSurface();

    return () => {
      hidePostTradeNotificationSurface();
    };
  }, []);

  useEffect(() => {
    if (hasTrackedViewedRef.current) {
      return;
    }

    hasTrackedViewedRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_VIEWED)
        .addProperties({
          initial_status: getAnalyticsStatus(params.status),
          ...sharedAnalyticsProperties,
        })
        .build(),
    );
  }, [
    createEventBuilder,
    params.status,
    sharedAnalyticsProperties,
    trackEvent,
  ]);

  useEffect(() => {
    const isTerminalStatus =
      status === PostTradeStatus.Success || status === PostTradeStatus.Failed;
    const hasSubmittedTransaction =
      Boolean(params.transactionMetaId) || Boolean(params.transactionHash);

    if (
      !isTerminalStatus ||
      !hasSubmittedTransaction ||
      hasRefreshedBalancesRef.current
    ) {
      return;
    }

    hasRefreshedBalancesRef.current = true;
    dispatch(incrementBridgeBalanceRefreshKey());
  }, [dispatch, params.transactionHash, params.transactionMetaId, status]);

  const subtitle = getTradeSubtitle({
    sourceAmount: params.sourceAmount,
    destAmount: params.destAmount,
    sourceToken: params.sourceToken,
    destToken: params.destToken,
  });
  const titleType = isBridge ? 'bridge' : 'swap';

  const trackButtonClicked = useCallback(
    (
      ctaClicked: PostTradeAnalyticsCta,
      clickedTokenProperties?: Record<string, unknown>,
    ) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_BUTTON_CLICKED,
        )
          .addProperties({
            status_at_click: getAnalyticsStatus(status),
            cta_clicked: ctaClicked,
            time_modal_open_ms: getTimeModalOpenMs(),
            ...clickedTokenProperties,
            ...sharedAnalyticsProperties,
          })
          .build(),
      );
    },
    [
      createEventBuilder,
      getTimeModalOpenMs,
      sharedAnalyticsProperties,
      status,
      trackEvent,
    ],
  );

  const handleDismiss = useCallback(
    (hasPendingAction?: boolean) => {
      if (shouldSkipDismissedTrackingRef.current || hasPendingAction) {
        shouldSkipDismissedTrackingRef.current = false;
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_DISMISSED)
          .addProperties({
            status_at_dismissal: getAnalyticsStatus(status),
            time_modal_open_ms: getTimeModalOpenMs(),
            ...sharedAnalyticsProperties,
          })
          .build(),
      );
    },
    [
      createEventBuilder,
      getTimeModalOpenMs,
      sharedAnalyticsProperties,
      status,
      trackEvent,
    ],
  );

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleViewActivity = () => {
    trackButtonClicked('view_activity');
    shouldSkipDismissedTrackingRef.current = true;
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    });
  };

  const handleTryAgain = () => {
    trackButtonClicked('try_again');
    shouldSkipDismissedTrackingRef.current = true;
    if (params.sourceToken) {
      dispatch(setSourceToken(params.sourceToken));
    }
    if (params.destToken) {
      dispatch(setDestToken(params.destToken));
      dispatch(setIsDestTokenManuallySet(true));
    }
    dispatch(setSourceAmount(params.sourceAmount));

    Engine.context.BridgeController?.resetState?.();
    // Re-request a quote since resetState() cleared it and identical inputs
    // won't re-trigger BridgeView's quote effect.
    updateQuoteParams();

    sheetRef.current?.onCloseBottomSheet();
  };

  const handleSuggestionPress = (token: TrendingAsset) => {
    let selectedDestToken;
    try {
      selectedDestToken = convertApiTokenToBridgeToken(
        token,
        getTrendingTokenImageUrl(token.assetId),
      );
    } catch {
      return;
    }

    trackButtonClicked('trending_token', {
      token_symbol_clicked: selectedDestToken.symbol,
      token_address_clicked: selectedDestToken.address,
      token_clicked_is_imported: false,
    });
    shouldSkipDismissedTrackingRef.current = true;

    // Resolve a non-conflicting source token; the clicked suggestion is kept
    // as the destination. Fallbacks: previous source -> native gas -> chain
    // default -> prior trade's destination.
    let resolvedSourceToken: BridgeToken | undefined = params.sourceToken;
    if (isSameBridgeToken(resolvedSourceToken, selectedDestToken)) {
      const nativeSourceToken = getNativeSourceToken(selectedDestToken.chainId);
      if (isSameBridgeToken(nativeSourceToken, selectedDestToken)) {
        const defaultDestToken = getDefaultDestToken(selectedDestToken.chainId);
        if (
          defaultDestToken &&
          !isSameBridgeToken(defaultDestToken, selectedDestToken)
        ) {
          resolvedSourceToken = defaultDestToken;
        } else if (!isSameBridgeToken(params.destToken, selectedDestToken)) {
          resolvedSourceToken = params.destToken;
        }
      } else {
        resolvedSourceToken = nativeSourceToken;
      }
    }

    if (resolvedSourceToken) {
      dispatch(setSourceToken(resolvedSourceToken));
    }
    dispatch(setDestToken(selectedDestToken));
    dispatch(setIsDestTokenManuallySet(true));
    dispatch(setSourceAmount(undefined));
    dispatch(setDestAmount(undefined));
    dispatch(setSelectedQuoteRequestId(undefined));

    Engine.context.BridgeController?.resetState?.();
    sheetRef.current?.onCloseBottomSheet();
  };

  const footerButtonProps =
    status === PostTradeStatus.Failed
      ? {
          secondaryButtonProps: {
            children: strings('bridge.post_trade_modal.view_activity'),
            size: ButtonSize.Lg,
            onPress: handleViewActivity,
            testID: PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON,
          },
          primaryButtonProps: {
            children: strings('bridge.post_trade_modal.try_again'),
            size: ButtonSize.Lg,
            onPress: handleTryAgain,
            testID: PostTradeBottomSheetTestIds.TRY_AGAIN_BUTTON,
          },
        }
      : {
          secondaryButtonProps: {
            children: strings('bridge.post_trade_modal.view_activity'),
            size: ButtonSize.Lg,
            onPress: handleViewActivity,
            testID: PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON,
          },
          primaryButtonProps: undefined,
        };

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      onClose={handleDismiss}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: PostTradeBottomSheetTestIds.CLOSE_BUTTON }}
        twClassName="pt-4 h-auto"
      >
        <StatusIcon status={status} />
      </BottomSheetHeader>
      <Box style={styles.content}>
        <Text variant={TextVariant.HeadingLg} style={styles.title}>
          {strings(`bridge.post_trade_modal.${titleType}_${status}`)}
        </Text>
        {subtitle ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        ) : null}
      </Box>
      <PostTradeTokenSuggestions
        status={status}
        destToken={params.destToken}
        onTokenPress={handleSuggestionPress}
      />
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        secondaryButtonProps={footerButtonProps.secondaryButtonProps}
        primaryButtonProps={footerButtonProps.primaryButtonProps}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

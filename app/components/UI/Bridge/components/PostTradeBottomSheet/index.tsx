import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  IconColor as DSIconColor,
  IconName as DSIconName,
  IconSize as DSIconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Engine from '../../../../../core/Engine';
import {
  incrementBridgeBalanceRefreshKey,
  setDestToken,
  setIsDestTokenManuallySet,
  setSourceAmount,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import { formatSecondaryTokenAmount } from '../../utils/sourceAmountInputMode';
import { PostTradeBottomSheetTestIds } from './PostTradeBottomSheet.testIds';
import {
  PostTradeBottomSheetParams,
  PostTradeStatus,
} from './PostTradeBottomSheet.types';
import styleSheet from './PostTradeBottomSheet.styles';
import { usePostTradeTxStatus } from './usePostTradeTxStatus';

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

const StatusIcon = ({
  status,
  loadingIconContainerStyle,
}: {
  status: PostTradeStatus;
  loadingIconContainerStyle: StyleProp<ViewStyle>;
}) => {
  if (status !== PostTradeStatus.InProgress) {
    const isSuccess = status === PostTradeStatus.Success;

    return (
      <AvatarIcon
        iconName={isSuccess ? DSIconName.CheckBold : DSIconName.Error}
        severity={
          isSuccess ? AvatarIconSeverity.Success : AvatarIconSeverity.Error
        }
        size={AvatarIconSize.Xl}
        testID={PostTradeBottomSheetTestIds.STATUS_ICON}
      />
    );
  }

  return (
    <View
      style={loadingIconContainerStyle}
      testID={PostTradeBottomSheetTestIds.STATUS_ICON}
    >
      <Spinner
        color={DSIconColor.PrimaryDefault}
        spinnerIconProps={{
          size: DSIconSize.Xl,
        }}
      />
    </View>
  );
};

export const PostTradeBottomSheet = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasRefreshedBalancesRef = useRef(false);
  const { styles } = useStyles(styleSheet, {});
  const params = useParams<PostTradeBottomSheetParams>();
  const updateQuoteParams = useBridgeQuoteRequest();

  const status = usePostTradeTxStatus({
    initialStatus: params.status,
    transactionMetaId: params.transactionMetaId,
    transactionHash: params.transactionHash,
  });

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
  const titleType =
    params.sourceToken?.chainId &&
    params.destToken?.chainId &&
    params.sourceToken.chainId !== params.destToken.chainId
      ? 'bridge'
      : 'swap';

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleViewActivity = () => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    });
  };

  const handleTryAgain = () => {
    if (params.sourceToken) {
      dispatch(setSourceToken(params.sourceToken));
    }
    if (params.destToken) {
      dispatch(setDestToken(params.destToken));
      dispatch(setIsDestTokenManuallySet(true));
    }
    dispatch(setSourceAmount(params.sourceAmount));

    Engine.context.BridgeController?.resetState?.();

    sheetRef.current?.onCloseBottomSheet(() => {
      updateQuoteParams();
      updateQuoteParams.flush();
    });
  };

  const footerButtonProps =
    status === PostTradeStatus.Failed
      ? [
          {
            label: strings('bridge.post_trade_modal.view_activity'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            onPress: handleViewActivity,
            testID: PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON,
          },
          {
            label: strings('bridge.post_trade_modal.try_again'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            onPress: handleTryAgain,
            testID: PostTradeBottomSheetTestIds.TRY_AGAIN_BUTTON,
          },
        ]
      : undefined;

  return (
    <BottomSheet
      ref={sheetRef}
      style={styles.sheet}
      testID={PostTradeBottomSheetTestIds.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: PostTradeBottomSheetTestIds.CLOSE_BUTTON }}
      />
      <View style={styles.content}>
        <View style={styles.statusIcon}>
          <StatusIcon
            status={status}
            loadingIconContainerStyle={styles.loadingIconContainer}
          />
        </View>
        <Text
          variant={TextVariant.HeadingLG}
          style={styles.title}
          testID={PostTradeBottomSheetTestIds.TITLE}
        >
          {strings(`bridge.post_trade_modal.${titleType}_${status}`)}
        </Text>
        {subtitle ? (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.subtitle}
            testID={PostTradeBottomSheetTestIds.SUBTITLE}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {footerButtonProps ? (
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={footerButtonProps}
          style={styles.footer}
        />
      ) : null}
    </BottomSheet>
  );
};

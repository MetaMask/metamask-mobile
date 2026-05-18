import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import type { MoneyAccount } from '@metamask/money-account-controller';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  selectCardDelegationSettings,
  selectCardHomeDataStatus,
  selectIsCardAuthenticated,
  selectIsCardholder,
  selectIsMoneyAccountDelegatedForCard,
} from '../../../../selectors/cardController';
import {
  selectPendingMoneyAccountCardLink,
  setPendingMoneyAccountCardLink,
} from '../../../../core/redux/slices/card';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import {
  hasMoneyAccountCardRequirements,
  resolveMoneyAccountCardToken,
} from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { CardLinkageInProgressError } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { BAANX_MAX_LIMIT } from '../constants';
import { CardFundingToken } from '../types';
import { UserCancelledError } from './useCardDelegation';

export type LinkageStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error'
  | 'cancelled';

export interface LinkFlowOrigin {
  screen: string;
  params?: object;
}

export interface UseMoneyAccountCardLinkageReturn {
  hasMoneyAccountRequirements: boolean;
  isCardAuthenticated: boolean;
  primaryMoneyAccount: MoneyAccount | undefined;
  moneyAccountCardToken: CardFundingToken | null;
  canLink: boolean;

  status: LinkageStatus;
  isLinking: boolean;
  error: Error | null;

  startLinkFlow: (origin: LinkFlowOrigin) => void;
  openLinkCardSheet: () => void;
  confirmLinkInBackground: () => Promise<boolean>;
  reset: () => void;
}

/**
 * UI-only hook that wraps `CardController.linkMoneyAccountCard` and owns the
 * pending / success / error / cancel toasts.
 *
 * Business logic — on-chain signing, transaction submission, confirmation
 * waiting and provider reporting — lives entirely in the controller. This hook
 * is a thin orchestration layer for the screen wiring it.
 */
export const useMoneyAccountCardLinkage =
  (): UseMoneyAccountCardLinkageReturn => {
    const { toastRef } = useContext(ToastContext);
    const theme = useTheme();
    const navigation = useNavigation();
    const dispatch = useDispatch();

    const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
    const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
    const isMoneyAccountEnabled = useSelector(
      selectMoneyEnableMoneyAccountFlag,
    );
    const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
    const isCardholder = useSelector(selectIsCardholder);
    const delegationSettings = useSelector(selectCardDelegationSettings);
    const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
    const isAlreadyDelegated = useSelector(
      selectIsMoneyAccountDelegatedForCard,
    );
    const pendingMoneyAccountCardLink = useSelector(
      selectPendingMoneyAccountCardLink,
    );

    const [status, setStatus] = useState<LinkageStatus>('idle');
    const [error, setError] = useState<Error | null>(null);

    const moneyAccountCardToken = useMemo(
      () => resolveMoneyAccountCardToken(delegationSettings),
      [delegationSettings],
    );

    const hasRequirements = hasMoneyAccountCardRequirements({
      isMoneyAccountEnabled,
      vaultConfig,
      moneyAccountAddress: primaryMoneyAccount?.address,
    });

    const canLink = Boolean(
      hasRequirements &&
        isCardAuthenticated &&
        moneyAccountCardToken &&
        !isAlreadyDelegated,
    );

    const showPendingToast = useCallback(() => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('money.metamask_card.link_pending_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings('money.metamask_card.link_pending_description'),
            isBold: false,
          },
        ],
        iconName: IconName.Loading,
        hasNoTimeout: true,
        startAccessory: (
          <Box twClassName="pr-3">
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
            />
          </Box>
        ),
      });
    }, [toastRef]);

    const showSuccessToast = useCallback(() => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('money.metamask_card.link_success_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings('money.metamask_card.link_success_description'),
            isBold: false,
          },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
    }, [theme.colors.success.default, toastRef]);

    const showErrorToast = useCallback(() => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('money.metamask_card.link_error'), isBold: true },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.error.muted,
        hasNoTimeout: false,
      });
    }, [theme.colors.error.default, theme.colors.error.muted, toastRef]);

    const openLinkCardSheet = useCallback((): void => {
      if (!canLink || !primaryMoneyAccount?.address) {
        showErrorToast();
        return;
      }
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.LINK_CARD_SHEET,
      });
    }, [canLink, primaryMoneyAccount?.address, navigation, showErrorToast]);

    const startLinkFlow = useCallback(
      (origin: LinkFlowOrigin): void => {
        if (!hasRequirements || !primaryMoneyAccount?.address) {
          showErrorToast();
          return;
        }

        if (isCardAuthenticated) {
          if (isAlreadyDelegated) {
            return;
          }

          if (!moneyAccountCardToken) {
            showErrorToast();
            return;
          }

          openLinkCardSheet();
          return;
        }

        dispatch(setPendingMoneyAccountCardLink(true));

        if (isCardholder) {
          navigation.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
            params: {
              screen: Routes.CARD.AUTHENTICATION,
              params: { postAuthRedirect: origin, showAuthPrompt: true },
            },
          });
          return;
        }

        navigation.navigate(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: { moneyAccountLinkIntent: true },
          },
        });
      },
      [
        hasRequirements,
        moneyAccountCardToken,
        primaryMoneyAccount?.address,
        isCardAuthenticated,
        isAlreadyDelegated,
        isCardholder,
        openLinkCardSheet,
        showErrorToast,
        navigation,
        dispatch,
      ],
    );

    useEffect(() => {
      if (!pendingMoneyAccountCardLink) return;
      if (!isCardAuthenticated) return;

      if (!hasRequirements || !primaryMoneyAccount?.address) {
        dispatch(setPendingMoneyAccountCardLink(false));
        return;
      }

      if (isAlreadyDelegated) {
        dispatch(setPendingMoneyAccountCardLink(false));
        return;
      }

      if (!moneyAccountCardToken) {
        if (
          cardHomeDataStatus === 'success' ||
          cardHomeDataStatus === 'error'
        ) {
          dispatch(setPendingMoneyAccountCardLink(false));
        }
        return;
      }

      dispatch(setPendingMoneyAccountCardLink(false));
      openLinkCardSheet();
    }, [
      pendingMoneyAccountCardLink,
      isCardAuthenticated,
      hasRequirements,
      moneyAccountCardToken,
      primaryMoneyAccount?.address,
      isAlreadyDelegated,
      cardHomeDataStatus,
      openLinkCardSheet,
      dispatch,
    ]);

    const confirmLinkInBackground = useCallback(async (): Promise<boolean> => {
      if (!canLink || !primaryMoneyAccount?.address) {
        showErrorToast();
        return false;
      }

      if (Engine.context.CardController.isLinkageInProgress()) {
        return false;
      }

      setStatus('pending');
      setError(null);
      showPendingToast();

      try {
        await Engine.context.CardController.linkMoneyAccountCard({
          moneyAccountAddress: primaryMoneyAccount.address,
          delegationAmountHuman: BAANX_MAX_LIMIT,
        });
        setStatus('success');
        showSuccessToast();
        return true;
      } catch (caught) {
        const linkageError =
          caught instanceof Error ? caught : new Error(String(caught));

        if (linkageError instanceof UserCancelledError) {
          setStatus('cancelled');
          return false;
        }

        if (linkageError instanceof CardLinkageInProgressError) {
          setStatus('idle');
          setError(null);
          return false;
        }

        Logger.error(linkageError, 'useMoneyAccountCardLinkage failed');
        setError(linkageError);
        setStatus('error');
        showErrorToast();
        return false;
      }
    }, [
      canLink,
      primaryMoneyAccount?.address,
      showErrorToast,
      showPendingToast,
      showSuccessToast,
    ]);

    const reset = useCallback(() => {
      setStatus('idle');
      setError(null);
    }, []);

    return {
      hasMoneyAccountRequirements: hasRequirements,
      isCardAuthenticated,
      primaryMoneyAccount,
      moneyAccountCardToken,
      canLink,

      status,
      isLinking: status === 'pending',
      error,

      startLinkFlow,
      openLinkCardSheet,
      confirmLinkInBackground,
      reset,
    };
  };

export default useMoneyAccountCardLinkage;

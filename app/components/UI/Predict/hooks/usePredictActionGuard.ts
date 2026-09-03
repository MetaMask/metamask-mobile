import { useCallback, useContext, useRef } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useAppThemeFromContext } from '../../../../util/theme';
import type { PredictEligibility } from '../types';
import { usePredictEligibility } from './usePredictEligibility';

interface UsePredictActionGuardOptions {
  navigation: AppNavigationProp;
}

interface ExecuteGuardedActionOptions {
  attemptedAction?: string;
}

interface UsePredictActionGuardResult {
  executeGuardedAction: (
    action: () => void | Promise<void>,
    options?: ExecuteGuardedActionOptions,
  ) => void | Promise<void>;
  isEligible: boolean;
}

export const usePredictActionGuard = ({
  navigation,
}: UsePredictActionGuardOptions): UsePredictActionGuardResult => {
  const { isEligible, isIneligible, refreshEligibility } =
    usePredictEligibility();
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();
  const retryInFlightRef = useRef(false);
  const retryGuardedActionRef = useRef<
    (
      action: () => void | Promise<void>,
      attemptedAction?: string,
    ) => Promise<void>
  >(async () => undefined);

  const handleIneligible = useCallback(
    (attemptedAction?: string) => {
      if (attemptedAction) {
        Engine.context.PredictController.trackGeoBlockTriggered({
          attemptedAction,
        });
      }

      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    },
    [navigation],
  );

  const showConnectionErrorToast = useCallback(
    (action: () => void | Promise<void>, attemptedAction?: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('predict.error.title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings('predict.error.description'),
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        linkButtonOptions: {
          label: strings('predict.error.retry'),
          onPress: () => {
            retryGuardedActionRef.current(action, attemptedAction);
          },
        },
      });
    },
    [theme.colors.accent04.normal, theme.colors.error.default, toastRef],
  );

  const applyEligibilityResult = useCallback(
    async (
      result: PredictEligibility,
      action: () => void | Promise<void>,
      attemptedAction?: string,
    ) => {
      if (result.status === 'eligible') {
        await action();
        return;
      }
      if (result.status === 'ineligible') {
        handleIneligible(attemptedAction);
        return;
      }
      showConnectionErrorToast(action, attemptedAction);
    },
    [handleIneligible, showConnectionErrorToast],
  );

  const retryGuardedAction = useCallback(
    async (action: () => void | Promise<void>, attemptedAction?: string) => {
      if (retryInFlightRef.current) {
        return;
      }
      retryInFlightRef.current = true;
      try {
        const result = await refreshEligibility();
        await applyEligibilityResult(result, action, attemptedAction);
      } finally {
        retryInFlightRef.current = false;
      }
    },
    [applyEligibilityResult, refreshEligibility],
  );
  retryGuardedActionRef.current = retryGuardedAction;

  const executeGuardedAction = useCallback(
    (
      action: () => void | Promise<void>,
      options: ExecuteGuardedActionOptions = {},
    ) => {
      const { attemptedAction } = options;

      if (isEligible) {
        return action();
      }

      if (isIneligible) {
        handleIneligible(attemptedAction);
        return;
      }

      showConnectionErrorToast(action, attemptedAction);
    },
    [handleIneligible, isEligible, isIneligible, showConnectionErrorToast],
  );

  return {
    executeGuardedAction,
    isEligible,
  };
};

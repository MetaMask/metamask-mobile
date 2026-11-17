import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { selectMoneyAccountAccessBlockReason } from '../../UI/Money/selectors/visibility';
import Routes from '../../../constants/navigation/Routes';
import { useHasProMembership } from '../../../hooks/useHasProMembership';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from '../../../hooks/useMoneyAccountPlusAccess';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { ensureError } from '../../../util/errorUtils';
import { strings } from '../../../../locales/i18n';
import Benefits from './screens/Benefits';
import Success from './screens/Success';
import type { AppStackNavigationProp } from '../../../core/NavigationService/types';
import {
  DEFAULT_PLAN,
  type PlanId,
} from './screens/Benefits/Benefits.constants';
import type { SelectedPlusPlan } from './screens/Benefits/utils/getSelectedPlusPlan';
import { useProSubscriptionPaymentToasts } from './hooks/useProSubscriptionPaymentToasts';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';
import { openProHubFromSubscriptionModal } from './utils/openProHubFromSubscriptionModal';

const ProSubscriptionScreen = {
  Benefits: 'benefits',
  Success: 'success',
} as const;

type ProSubscriptionScreen =
  (typeof ProSubscriptionScreen)[keyof typeof ProSubscriptionScreen];

// iOS presents this route as a sheet that already starts below the status
// bar. Android draws the modal edge to edge, so the close button needs the
// top inset or it sits on the status icons.
const SAFE_AREA_EDGES: Edge[] =
  Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom'];

const ProSubscription = () => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const tw = useTailwind();
  const route =
    useRoute<
      RouteProp<
        { ProSubscription: { source?: string; initialPlan?: string } },
        'ProSubscription'
      >
    >();

  const proAccess = useMoneyAccountPlusAccess();
  const hasMembership = useHasProMembership();
  const accessBlockReason = useSelector(selectMoneyAccountAccessBlockReason);
  const [currentScreen, setCurrentScreen] = useState<ProSubscriptionScreen>(
    ProSubscriptionScreen.Benefits,
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (route.params?.initialPlan as PlanId | undefined) ?? DEFAULT_PLAN,
  );
  const [checkoutPlan, setCheckoutPlan] = useState<
    SelectedPlusPlan | undefined
  >();
  const [isCheckoutInProgress, setIsCheckoutInProgress] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | undefined>();
  const isContinuingRef = useRef(false);
  const isMountedRef = useRef(true);
  const { showProcessingToast } = useProSubscriptionPaymentToasts();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Dismiss when the Pro flag is off, or when Money Account is blocked and
  // the user has no membership. Unknown access waits so a restored member's
  // fetch can finish before a blocked country closes checkout. A member in a
  // blocked country gets the Money geo sheet instead of Pro Hub.
  useEffect(() => {
    if (proAccess === MoneyAccountPlusAccess.Disabled) {
      navigation.goBack();
      return;
    }

    if (
      proAccess !== MoneyAccountPlusAccess.Unknown &&
      accessBlockReason === 'geo_blocked' &&
      hasMembership
    ) {
      navigation.goBack();
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
        params: { product: 'metamask_orange' },
      });
      return;
    }

    if (
      proAccess !== MoneyAccountPlusAccess.Unknown &&
      accessBlockReason !== undefined &&
      !hasMembership
    ) {
      navigation.goBack();
      return;
    }

    // Checkout refreshes subscriptions before it resolves, so the user can
    // become a member while Benefits is still mounted. Keep this screen up
    // until Success is showing.
    if (
      hasMembership &&
      currentScreen !== ProSubscriptionScreen.Success &&
      !isCheckoutInProgress
    ) {
      navigation.dispatch(openProHubFromSubscriptionModal);
    }
  }, [
    proAccess,
    hasMembership,
    accessBlockReason,
    currentScreen,
    isCheckoutInProgress,
    navigation,
  ]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePlanChange = useCallback(
    (planId: PlanId) => {
      setSelectedPlan(planId);
      navigation.setParams({ initialPlan: planId });
    },
    [navigation],
  );

  const handleCheckoutStart = useCallback(() => {
    setIsCheckoutInProgress(true);
  }, []);

  const handleCheckoutError = useCallback(() => {
    setIsCheckoutInProgress(false);
  }, []);

  const handleSuccess = useCallback((plan: SelectedPlusPlan) => {
    setCheckoutPlan(plan);
    setCurrentScreen(ProSubscriptionScreen.Success);
  }, []);

  const handleProcessing = useCallback(() => {
    showProcessingToast();
    navigation.dispatch(openProHubFromSubscriptionModal);
  }, [navigation, showProcessingToast]);

  const handleSubscriptionOnSuccess = useCallback(async () => {
    // Card checkout completes outside the controller, so wait for canonical
    // state before opening the hub. Stay on success if the refresh fails:
    // Pro Hub would otherwise treat empty state as non-subscriber and bounce.
    if (isContinuingRef.current) {
      return;
    }
    isContinuingRef.current = true;
    setIsContinuing(true);
    setContinueError(undefined);
    try {
      await Engine.context.SubscriptionController.getSubscriptions();
    } catch (error) {
      Logger.error(ensureError(error, 'ProSubscription.refreshSubscriptions'), {
        tags: {
          feature: 'money_account_plus',
          operation: 'refresh_subscriptions_after_checkout',
        },
      });
      if (!isMountedRef.current) {
        return;
      }
      setContinueError(strings('pro_subscription.success.continue_error'));
      isContinuingRef.current = false;
      setIsContinuing(false);
      return;
    }
    if (!isMountedRef.current) {
      return;
    }
    navigation.dispatch(openProHubFromSubscriptionModal);
  }, [navigation]);

  let screenContent: React.ReactNode = null;
  if (currentScreen === ProSubscriptionScreen.Benefits) {
    screenContent = (
      <Benefits
        onSuccess={handleSuccess}
        onProcessing={handleProcessing}
        onCheckoutStart={handleCheckoutStart}
        onCheckoutError={handleCheckoutError}
        onPlanChange={handlePlanChange}
        initialPlan={selectedPlan}
      />
    );
  } else if (checkoutPlan) {
    screenContent = (
      <Success
        onSuccess={handleSubscriptionOnSuccess}
        isContinuing={isContinuing}
        continueError={continueError}
      />
    );
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={SAFE_AREA_EDGES}
    >
      {/* Shared close button — sits above both Benefits and Success screens */}
      <Box twClassName="px-4 pt-4 pb-8 flex-row items-center justify-end">
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={handleClose}
          testID={ProSubscriptionTestIds.CLOSE_BUTTON}
        />
      </Box>

      {/* Membership statuses leave for the hub. Everyone else, including a
          still-loading fetch, sees Benefits instead of a blank page. */}
      {(currentScreen === ProSubscriptionScreen.Success ||
        isCheckoutInProgress ||
        (!hasMembership && proAccess !== MoneyAccountPlusAccess.Disabled)) &&
        screenContent}
    </SafeAreaView>
  );
};

export default ProSubscription;

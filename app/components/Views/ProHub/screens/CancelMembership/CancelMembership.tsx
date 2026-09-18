import React, { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { setOrangeMemberSince } from '../../../../../actions/experimental';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { MOCK_PRORATA_REFUND } from './CancelMembership.constants';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import { buildPostCancellationResetState } from './CancelMembership.utils';
import CancelSurveyStep from './components/CancelSurveyStep';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';

/**
 * The cancellation flow: a reason survey, then a native confirmation.
 *
 * The in-app "Plan canceled" success step was removed. Confirming now happens
 * in the platform alert and lands the member on the account menu, where the
 * Orange row has dropped back to its pre-upgrade state — the cancellation is
 * visible in the product rather than asserted by a screen. That also retired
 * the machinery that existed only to guard the success step: a disabled
 * swipe-back, a `beforeRemove` interceptor and an Android `BackHandler`, all of
 * which were there to stop the member navigating back into a stale membership.
 *
 * `CancelSuccessStep` is consequently unused. Left on disk rather than deleted,
 * since restoring the step is a product decision.
 */
const CancelMembership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeepMembership = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleReasonSelect = useCallback((id: string) => {
    setSelectedReasonId(id);
  }, []);

  /*
   * Clears the membership and resets to the account menu. This is the downgrade
   * path. The ref guards against a double reset if the alert's handler somehow
   * fires twice. Spike only — see useOrangeMembership.
   */
  const finishCancellation = useCallback(() => {
    dispatch(setOrangeMemberSince(null));
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    navigation.dispatch((state) =>
      CommonActions.reset(buildPostCancellationResetState(state)),
    );
  }, [dispatch, navigation]);

  /*
   * A native alert rather than an in-app sheet: this is the point of no return,
   * and the platform dialog is the affordance a member already reads as one —
   * it also cannot be dismissed by a swipe the way a sheet can. It carries the
   * refund because that is the one thing the member is owed and the one fact
   * they cannot recover after confirming.
   */
  const handleCancelConfirm = useCallback(() => {
    Alert.alert(
      strings('pro_hub.cancel_membership.confirm_title'),
      strings('pro_hub.cancel_membership.confirm_body', {
        refund: MOCK_PRORATA_REFUND,
      }),
      [
        {
          text: strings('pro_hub.cancel_membership.keep_membership'),
          style: 'cancel',
        },
        {
          text: strings('pro_hub.cancel_membership.confirm_cta'),
          style: 'destructive',
          onPress: finishCancellation,
        },
      ],
      { cancelable: true },
    );
  }, [finishCancellation]);

  const isNativeHeaderEnabled = useNativeHeader({ title: '' });

  return (
    <SafeAreaView
      style={[tw.style('flex-1 bg-background-default')]}
      edges={isNativeHeaderEnabled ? ['bottom'] : ['top', 'bottom']}
      testID={CancelMembershipTestIds.CONTAINER}
    >
      <CancelSurveyStep
        isNativeHeaderEnabled={isNativeHeaderEnabled}
        selectedReasonId={selectedReasonId}
        onReasonSelect={handleReasonSelect}
        onBack={handleBack}
        onKeepMembership={handleKeepMembership}
        onCancelConfirm={handleCancelConfirm}
      />
    </SafeAreaView>
  );
};

export default CancelMembership;

import { useCallback, useRef } from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Engine from '../../../../core/Engine';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyTaxError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
  ReferralLocalizedTextKey,
  TaxAnswerResultDto,
  TaxFormTokenDto,
  TaxMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import {
  holdMintRateLimit,
  holdTaxFormSession,
  resolveTaxFormUrl,
  taxRefusalAction,
  taxSheetFor,
  withMinutes,
  type TaxDocumentationSheet,
  type TaxQuestion,
  type TaxRefusalAction,
} from '../utils/taxDocumentation';
import { useEarningsSummary } from './useEarningsSummary';
import useRewardsToast from './useRewardsToast';

const TAX_ROUTES = new Set<string>([
  Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
  Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
  Routes.MODAL.REWARDS_TAX_CONTACT_SHEET,
  Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
  Routes.REWARDS_TAX_FORM_VIEW,
]);

export type TaxMintOutcome = 'opened' | 'rate_limited' | 'closed' | 'failed';

function copy(
  localizedText: ReferralLocalizedText | undefined,
  key: ReferralLocalizedTextKey,
): string {
  return localizedText?.[key] ?? '';
}

/**
 * Reads `GET /tax/me`, answers the two questions, and mints the form token.
 * Sheets and the Claim press share it. The controller caches the read for
 * five minutes. A read after an answer, the form, or a claim refusal asks
 * for a fresh determination.
 */
export function useTaxDocumentation(profileId: string) {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const pressBusy = useRef(false);
  const answerBusy = useRef(false);
  const mintBusy = useRef(false);

  const refreshSummary = useCallback(() => {
    void fetchEarningsSummary({ forceFresh: true }).catch(() => undefined);
  }, [fetchEarningsSummary]);

  const showError = useCallback(
    (message: string) => {
      if (message.length === 0) {
        return;
      }
      showToast(RewardsToastOptions.error(message));
    },
    [RewardsToastOptions, showToast],
  );

  const showSuccess = useCallback(
    (message: string) => {
      if (message.length === 0) {
        return;
      }
      showToast(RewardsToastOptions.success(message));
    },
    [RewardsToastOptions, showToast],
  );

  const go = useCallback(
    (name: string, params?: object) => {
      if (TAX_ROUTES.has(route.name)) {
        navigation.dispatch(StackActions.replace(name, params));
        return;
      }
      (navigation.navigate as (screen: string, params?: object) => void)(
        name,
        params,
      );
    },
    [navigation, route.name],
  );

  const closeTaxFlow = useCallback(() => {
    if (TAX_ROUTES.has(route.name)) {
      navigation.goBack();
    }
  }, [navigation, route.name]);

  const openInfo = useCallback(
    (
      titleKey: ReferralLocalizedTextKey,
      descriptionKey: ReferralLocalizedTextKey,
    ) => {
      go(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
        title: copy(localizedText, titleKey),
        description: copy(localizedText, descriptionKey),
      });
    },
    [go, localizedText],
  );

  const openSheet = useCallback(
    (sheet: TaxDocumentationSheet) => {
      if (sheet.kind === 'none') {
        closeTaxFlow();
        return;
      }
      if (sheet.kind === 'info') {
        openInfo(sheet.titleKey, sheet.descriptionKey);
        return;
      }
      if (sheet.kind === 'question') {
        go(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET, {
          question: sheet.question,
          title: copy(localizedText, sheet.titleKey),
          description: copy(localizedText, sheet.descriptionKey),
          yesLabel: copy(localizedText, 'taxAnswerYes'),
          noLabel: copy(localizedText, 'taxAnswerNo'),
          profileId,
        });
        return;
      }
      if (sheet.kind === 'contact') {
        go(Routes.MODAL.REWARDS_TAX_CONTACT_SHEET, {
          title: copy(localizedText, sheet.titleKey),
          description: copy(localizedText, sheet.descriptionKey),
          contactLabel: copy(localizedText, 'taxContactSupportButton'),
        });
        return;
      }
      go(Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET, {
        title: copy(localizedText, sheet.titleKey),
        description: copy(localizedText, sheet.descriptionKey),
        continueLabel: copy(localizedText, 'taxOpenFormButton'),
        notNowLabel: copy(localizedText, 'taxNotNowButton'),
        changeAnswerLabel: sheet.canChangeAnswer
          ? copy(localizedText, 'taxChangeAnswerButton')
          : undefined,
        reason: sheet.reason,
        profileId,
      });
    },
    [closeTaxFlow, go, localizedText, openInfo, profileId],
  );

  const showTaxMe = useCallback(
    (taxMe: TaxMeDto): boolean => {
      const sheet = taxSheetFor(taxMe);
      if (sheet.kind === 'none') {
        closeTaxFlow();
        if (taxMe.reason === 'GATE_OFF') {
          refreshSummary();
        }
        return false;
      }
      openSheet(sheet);
      return true;
    },
    [closeTaxFlow, openSheet, refreshSummary],
  );

  const readTaxMe = useCallback((force = false) => {
    if (force) {
      return Engine.controllerMessenger.call(
        'RewardsMoneyController:getTaxMe',
        {
          forceFresh: true,
        },
      );
    }
    return Engine.controllerMessenger.call('RewardsMoneyController:getTaxMe');
  }, []);

  const prefetchTaxMe = useCallback(() => {
    void readTaxMe().catch(() => undefined);
  }, [readTaxMe]);

  const openFallback = useCallback(
    (fallback: Extract<TaxRefusalAction, { kind: 'reroute' }>['fallback']) => {
      if (fallback === 'close') {
        closeTaxFlow();
        refreshSummary();
        return;
      }
      if (fallback === 'attestation') {
        openSheet({
          kind: 'question',
          question: 'attestation',
          titleKey: 'taxAttestationTitle',
          descriptionKey: 'taxAttestationDescription',
        });
        return;
      }
      if (fallback === 'open_form') {
        openSheet({
          kind: 'open_form',
          titleKey: 'taxOpenFormTitle',
          descriptionKey: 'taxFormRequiredDescription',
          reason: 'NO_FORM',
          canChangeAnswer: false,
        });
        return;
      }
      if (fallback === 'pending') {
        openInfo('taxFormPendingTitle', 'taxFormPendingDescription');
        return;
      }
      openInfo('taxDeterminationTitle', 'taxDeterminationDescription');
    },
    [closeTaxFlow, openInfo, openSheet, refreshSummary],
  );

  const reroute = useCallback(
    async (
      fallback: Extract<TaxRefusalAction, { kind: 'reroute' }>['fallback'],
    ) => {
      try {
        const taxMe = await readTaxMe(true);
        const sheet = taxSheetFor(taxMe);
        if (sheet.kind === 'none') {
          closeTaxFlow();
          refreshSummary();
          return;
        }
        openSheet(sheet);
      } catch (error) {
        if (error instanceof RewardsMoneyAuthorizationError) {
          return;
        }
        openFallback(fallback);
      }
    },
    [closeTaxFlow, openFallback, openSheet, readTaxMe, refreshSummary],
  );

  const applyRefusal = useCallback(
    async (
      call: 'answer' | 'mint',
      error: unknown,
    ): Promise<TaxMintOutcome | 'stay'> => {
      if (error instanceof RewardsMoneyAuthorizationError) {
        return 'stay';
      }
      if (!(error instanceof RewardsMoneyTaxError)) {
        showError(copy(localizedText, 'taxErrorToast'));
        return 'failed';
      }
      const action = taxRefusalAction(call, error.status, error.code);
      if (action.kind === 'reroute') {
        await reroute(action.fallback);
        return 'closed';
      }
      if (action.kind === 'pending_info') {
        openInfo('taxFormPendingTitle', 'taxFormPendingDescription');
        return 'closed';
      }
      if (action.kind === 'not_needed_toast') {
        closeTaxFlow();
        refreshSummary();
        showSuccess(copy(localizedText, 'taxNotNeededToast'));
        return 'closed';
      }
      if (action.kind === 'wait_toast') {
        showError(
          withMinutes(
            copy(localizedText, 'claimFailureWaitMinutesToast'),
            error.retryAfterSeconds,
          ),
        );
        return 'stay';
      }
      if (action.kind === 'rate_limited') {
        holdMintRateLimit(profileId, error.retryAfterSeconds);
        showError(
          withMinutes(
            copy(localizedText, 'taxFormRateLimitedToast'),
            error.retryAfterSeconds,
          ),
        );
        return 'rate_limited';
      }
      if (action.kind === 'provider_dead_end') {
        openInfo('taxDeterminationTitle', 'taxDeterminationDescription');
        return 'closed';
      }
      if (action.kind === 'log_and_error_toast') {
        Logger.error(error, 'Tax answer was rejected');
        showError(copy(localizedText, 'taxErrorToast'));
        return 'stay';
      }
      showError(copy(localizedText, 'taxErrorToast'));
      return 'failed';
    },
    [
      closeTaxFlow,
      localizedText,
      openInfo,
      profileId,
      refreshSummary,
      reroute,
      showError,
      showSuccess,
    ],
  );

  const submitAnswer = useCallback(
    async (question: TaxQuestion, value: boolean) => {
      if (answerBusy.current) {
        return;
      }
      answerBusy.current = true;
      try {
        const result: TaxAnswerResultDto =
          question === 'attestation'
            ? await Engine.controllerMessenger.call(
                'RewardsMoneyController:submitTaxAttestation',
                value,
              )
            : await Engine.controllerMessenger.call(
                'RewardsMoneyController:submitTaxUsActivity',
                value,
              );
        if (result.review === 'PENDING') {
          openInfo('taxFormPendingTitle', 'taxFormPendingDescription');
          return;
        }
        try {
          const taxMe = await readTaxMe(true);
          const sheet = taxSheetFor(taxMe);
          if (sheet.kind === 'none') {
            closeTaxFlow();
            refreshSummary();
            if (!value) {
              showSuccess(copy(localizedText, 'taxNotNeededToast'));
            }
            return;
          }
          openSheet(sheet);
          refreshSummary();
        } catch (error) {
          if (!(error instanceof RewardsMoneyAuthorizationError)) {
            showError(copy(localizedText, 'taxErrorToast'));
          }
        }
      } catch (error) {
        await applyRefusal('answer', error);
      } finally {
        answerBusy.current = false;
      }
    },
    [
      applyRefusal,
      closeTaxFlow,
      localizedText,
      openInfo,
      openSheet,
      readTaxMe,
      refreshSummary,
      showError,
      showSuccess,
    ],
  );

  const mintTaxForm = useCallback(async (): Promise<TaxMintOutcome> => {
    if (mintBusy.current) {
      return 'failed';
    }
    const url = resolveTaxFormUrl(localizedText?.taxFormUrl);
    if (!url) {
      openInfo('taxDeterminationTitle', 'taxDeterminationDescription');
      return 'closed';
    }
    mintBusy.current = true;
    try {
      const minted: TaxFormTokenDto = await Engine.controllerMessenger.call(
        'RewardsMoneyController:mintTaxFormToken',
      );
      holdTaxFormSession(minted);
      go(Routes.REWARDS_TAX_FORM_VIEW, { url, profileId });
      return 'opened';
    } catch (error) {
      const outcome = await applyRefusal('mint', error);
      if (outcome === 'rate_limited') {
        return 'rate_limited';
      }
      if (outcome === 'stay') {
        return 'failed';
      }
      return outcome === 'opened' ? 'opened' : 'closed';
    } finally {
      mintBusy.current = false;
    }
  }, [applyRefusal, go, localizedText?.taxFormUrl, openInfo, profileId]);

  /**
   * A `tax-form:token-expired` re-mint. The view caps how many times it
   * asks. A refusal follows the mint rules and this returns null.
   */
  const replaceExpiredToken =
    useCallback(async (): Promise<TaxFormTokenDto | null> => {
      try {
        const minted: TaxFormTokenDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:mintTaxFormToken',
        );
        holdTaxFormSession(minted);
        return minted;
      } catch (error) {
        await applyRefusal('mint', error);
        return null;
      }
    }, [applyRefusal]);

  const rerouteFromForm = useCallback(async () => {
    await reroute('info');
  }, [reroute]);

  const closeFormWithError = useCallback(() => {
    showError(copy(localizedText, 'taxErrorToast'));
    closeTaxFlow();
  }, [closeTaxFlow, localizedText, showError]);

  const openPendingReview = useCallback(() => {
    openInfo('taxFormPendingTitle', 'taxFormPendingDescription');
    refreshSummary();
    void readTaxMe(true).catch(() => undefined);
  }, [openInfo, readTaxMe, refreshSummary]);

  const onClaimPress = useCallback(
    async (_summary: EarningsSummaryDto, claim: () => Promise<void>) => {
      if (pressBusy.current) {
        return;
      }
      pressBusy.current = true;
      try {
        let taxMe: TaxMeDto | null = null;
        try {
          taxMe = await readTaxMe();
        } catch (error) {
          if (!(error instanceof RewardsMoneyAuthorizationError)) {
            showError(copy(localizedText, 'taxErrorToast'));
          }
        }
        if (taxMe?.reason === 'GATE_OFF') {
          refreshSummary();
        }
        if (taxMe) {
          const sheet = taxSheetFor(taxMe);
          const blocksClaim = sheet.kind !== 'none' && taxMe.cleared === false;
          const renewalNudge =
            taxMe.state === 'RENEWAL_REQUIRED' &&
            taxMe.cleared === true &&
            sheet.kind !== 'none';
          if (blocksClaim || renewalNudge) {
            openSheet(sheet);
          }
        }
        await claim();
      } finally {
        pressBusy.current = false;
      }
    },
    [localizedText, openSheet, readTaxMe, refreshSummary, showError],
  );

  const openAfterClaimRefusal = useCallback(async () => {
    const taxMe = await readTaxMe(true);
    if (!showTaxMe(taxMe)) {
      throw new Error('Tax determination did not open a sheet');
    }
  }, [readTaxMe, showTaxMe]);

  return {
    prefetchTaxMe,
    onClaimPress,
    openAfterClaimRefusal,
    submitAnswer,
    mintTaxForm,
    replaceExpiredToken,
    rerouteFromForm,
    openPendingReview,
    closeFormWithError,
    showError,
  };
}

export default useTaxDocumentation;

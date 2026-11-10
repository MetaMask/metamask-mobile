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
  TaxFormSubmittedSnapshot,
  TaxFormTokenDto,
  TaxMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import {
  holdMintRateLimit,
  incomeHeldForTax,
  holdTaxFormSession,
  isOpenFormTaxMe,
  isTaxFlowEnabled,
  PRE_WEBHOOK_TAX_FORM_SNAPSHOT,
  resolveTaxFormUrl,
  taxFormSubmissionStillWaiting,
  taxFormSubmittedSnapshot,
  taxRefusalAction,
  taxSheetFor,
  taxSheetForClaim,
  withMinutes,
  type TaxDocumentationSheet,
  type TaxQuestion,
  type TaxRefusalAction,
} from '../utils/taxDocumentation';
import type { ClaimEarningsOptions } from './useClaimEarnings';
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
 * Whether the Claim press opens `sheet`, and whether it keeps follow-trade
 * out of the claim. An uncleared determination blocks income. A cleared
 * renewal only nudges.
 */
function claimSheetDecision(
  taxMe: TaxMeDto,
  sheet: TaxDocumentationSheet,
): { open: boolean; blocksClaim: boolean } {
  const hasSheet = sheet.kind !== 'none';
  const blocksClaim = hasSheet && taxMe.cleared === false;
  const renewalNudge =
    hasSheet && taxMe.state === 'RENEWAL_REQUIRED' && taxMe.cleared === true;
  return { open: blocksClaim || renewalNudge, blocksClaim };
}

function buildClaimOptions(
  omitFollowTrade: boolean,
  summary: EarningsSummaryDto | undefined,
): ClaimEarningsOptions | undefined {
  if (!omitFollowTrade && !summary) {
    return undefined;
  }
  return {
    ...(omitFollowTrade ? { omitFollowTrade: true } : {}),
    ...(summary ? { summary } : {}),
  };
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
  const taxFlowEnabled = isTaxFlowEnabled(localizedText?.taxFormUrl);
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const pressBusy = useRef(false);
  /** True while this press already has a tax sheet open that blocks income. */
  const blockingSheetOpen = useRef(false);
  const answerBusy = useRef(false);
  const mintBusy = useRef(false);

  const refreshSummary = useCallback(() => {
    void fetchEarningsSummary({ forceFresh: true }).catch(() => undefined);
  }, [fetchEarningsSummary]);

  const readFreshSummary = useCallback(async () => {
    try {
      return await fetchEarningsSummary({ forceFresh: true });
    } catch {
      return undefined;
    }
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
    (
      taxMe: TaxMeDto,
      submitted: TaxFormSubmittedSnapshot | null = null,
    ): boolean => {
      const sheet = taxSheetForClaim(taxMe, submitted);
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

  const readSubmitted =
    useCallback(async (): Promise<TaxFormSubmittedSnapshot | null> => {
      try {
        return await Engine.controllerMessenger.call(
          'RewardsMoneyController:getTaxFormSubmitted',
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to read the tax form submission marker',
        );
        return null;
      }
    }, []);

  const noteSubmitted = useCallback(
    async (snapshot: TaxFormSubmittedSnapshot | null) => {
      try {
        await Engine.controllerMessenger.call(
          'RewardsMoneyController:noteTaxFormSubmitted',
          snapshot,
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to store the tax form submission marker',
        );
      }
    },
    [],
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

  /** Clears the submit marker once `tax/me` has moved off its snapshot. */
  const dropStaleSubmitted = useCallback(
    async (
      submitted: TaxFormSubmittedSnapshot | null,
      taxMe: TaxMeDto,
    ): Promise<TaxFormSubmittedSnapshot | null> => {
      if (submitted && !taxFormSubmissionStillWaiting(submitted, taxMe)) {
        await noteSubmitted(null);
        return null;
      }
      return submitted;
    },
    [noteSubmitted],
  );

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
    void (async () => {
      // Claim treats a missing snapshot as a new form. Record this submit
      // before the fresh status read, which can be slow or fail.
      let remembered = PRE_WEBHOOK_TAX_FORM_SNAPSHOT;
      try {
        const cached = await readTaxMe(false);
        if (isOpenFormTaxMe(cached)) {
          remembered = taxFormSubmittedSnapshot(cached);
        }
      } catch (error) {
        if (error instanceof RewardsMoneyAuthorizationError) {
          return;
        }
      }
      await noteSubmitted(remembered);
      try {
        const taxMe = await readTaxMe(true);
        // A fresh read that is still an open form can be a new stored form
        // with the same reason. Keep the pre-submit snapshot only while
        // stored_at has not moved.
        if (!taxFormSubmissionStillWaiting(remembered, taxMe)) {
          await noteSubmitted(null);
          showTaxMe(taxMe);
        }
      } catch (error) {
        if (error instanceof RewardsMoneyAuthorizationError) {
          return;
        }
      }
    })();
  }, [noteSubmitted, openInfo, readTaxMe, refreshSummary, showTaxMe]);

  const readTaxMeForPress = useCallback(
    async (force: boolean): Promise<TaxMeDto | null> => {
      try {
        return await readTaxMe(force);
      } catch (error) {
        if (!(error instanceof RewardsMoneyAuthorizationError)) {
          showError(copy(localizedText, 'taxErrorToast'));
        }
        return null;
      }
    },
    [localizedText, readTaxMe, showError],
  );

  /**
   * Opens the sheet this press owes, and returns true when it blocks income.
   * Income cannot clear while that sheet is up. Submitting follow-trade on
   * its own comes back tax-required and navigates here again from Earnings,
   * stacking a second sheet.
   */
  const openClaimSheet = useCallback(
    (taxMe: TaxMeDto, submitted: TaxFormSubmittedSnapshot | null): boolean => {
      const sheet = taxSheetForClaim(taxMe, submitted);
      const decision = claimSheetDecision(taxMe, sheet);
      if (decision.open) {
        openSheet(sheet);
      }
      if (decision.blocksClaim) {
        blockingSheetOpen.current = true;
      }
      return decision.blocksClaim;
    },
    [openSheet],
  );

  /**
   * One forced summary read per press. The pressed summary still holds the
   * income that tax has just released, so it has no claim route and Claim
   * runs against this read. A second forced read would queue behind the
   * first, so a read that fails here is not retried. Without a held balance
   * a GATE_OFF read only refreshes the card in the background.
   */
  const readSummaryAfterTax = useCallback(
    async (
      taxMe: TaxMeDto | null,
      heldForTax: boolean,
    ): Promise<EarningsSummaryDto | undefined> => {
      if (heldForTax && taxMe?.cleared === true) {
        return readFreshSummary();
      }
      if (taxMe?.reason === 'GATE_OFF') {
        refreshSummary();
      }
      return undefined;
    },
    [readFreshSummary, refreshSummary],
  );

  const onClaimPress = useCallback(
    async (
      summary: EarningsSummaryDto,
      claim: (options?: ClaimEarningsOptions) => Promise<void>,
    ) => {
      if (pressBusy.current) {
        return;
      }
      pressBusy.current = true;
      try {
        if (!taxFlowEnabled) {
          await claim();
          return;
        }
        const readBack = await readSubmitted();
        // A tax hold means the cached tax/me may be stale. Taxbit can change
        // the determination without an app POST, and this press has no claim
        // route, so the sheet has to come from a fresh read.
        const heldForTax = incomeHeldForTax(summary);
        const taxMe = await readTaxMeForPress(readBack != null || heldForTax);
        const submitted = taxMe
          ? await dropStaleSubmitted(readBack, taxMe)
          : readBack;
        const freshSummary = await readSummaryAfterTax(taxMe, heldForTax);
        const omitFollowTrade = taxMe
          ? openClaimSheet(taxMe, submitted)
          : false;
        const claimOptions = buildClaimOptions(omitFollowTrade, freshSummary);
        if (claimOptions) {
          await claim(claimOptions);
        } else {
          await claim();
        }
      } finally {
        blockingSheetOpen.current = false;
        pressBusy.current = false;
      }
    },
    [
      dropStaleSubmitted,
      openClaimSheet,
      readSubmitted,
      readSummaryAfterTax,
      readTaxMeForPress,
      taxFlowEnabled,
    ],
  );

  const openAfterClaimRefusal = useCallback(async () => {
    if (blockingSheetOpen.current) {
      return;
    }
    if (!taxFlowEnabled) {
      throw new Error('Tax flow is disabled');
    }
    const readBack = await readSubmitted();
    const taxMe = await readTaxMe(true);
    const submitted = await dropStaleSubmitted(readBack, taxMe);
    if (!showTaxMe(taxMe, submitted)) {
      throw new Error('Tax determination did not open a sheet');
    }
  }, [dropStaleSubmitted, readSubmitted, readTaxMe, showTaxMe, taxFlowEnabled]);

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

/**
 * Tax documentation opens from Claim. Cashback still submits. Income does not.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/EarningsTab.tax.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { WebView } from '@metamask/react-native-webview';
import Routes from '../../../../../../constants/navigation/Routes';
import ReduxService from '../../../../../../core/redux';
import {
  RewardsMoneyClaimRefusalError,
  RewardsMoneyTaxError,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  EarningsSummaryDto,
  TaxMeDto,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { getRouteParamsProbeTestId } from '../../../../../../../tests/component-view/render';
import { renderEarningsTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  earningsSummaryFixture,
  REFERRAL_LOCALIZED_TEXT,
  referralMeFixture,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard.testIds';
import { TAX_FORM_QUESTION_SHEET_TEST_IDS } from '../TaxFormQuestionSheet.testIds';
import { TAX_FORM_OPEN_FORM_SHEET_TEST_IDS } from '../TaxFormOpenFormSheet.testIds';
import { TAX_FORM_CONTACT_US_SHEET_TEST_IDS } from '../TaxFormContactUsSheet.testIds';
import { REWARDS_TAX_FORM_VIEW_TEST_IDS } from '../../../Views/RewardsTaxFormView.testIds';
import { clearMintRateLimit } from '../../../utils/taxDocumentation';

const COPY = REFERRAL_LOCALIZED_TEXT;
const FORM_URL = 'https://tax-form.test/form';
const TOKEN = 'form-token-1';
const REMINTED = 'form-token-2';

const postMessage = (WebView as unknown as { postMessage: jest.Mock })
  .postMessage;

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

function taxMe(overrides: Partial<TaxMeDto> = {}): TaxMeDto {
  return {
    state: 'ACTION_REQUIRED',
    next_action: 'ANSWER_ATTESTATION',
    reason: 'NO_ATTESTATION',
    clears_until: null,
    cleared: false,
    can_change_answer: false,
    ...overrides,
  };
}

const ATTESTATION = taxMe();
const OPEN_FORM = taxMe({
  next_action: 'OPEN_FORM',
  reason: 'NO_FORM',
  can_change_answer: true,
});
const CLEARED = taxMe({
  state: 'COMPLETE_OR_VERIFIED',
  next_action: 'NONE',
  reason: null,
  cleared: true,
});

function withTaxHeldIncome(summary: EarningsSummaryDto): EarningsSummaryDto {
  const held = '2000000';
  const family = summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE;
  return {
    ...summary,
    held,
    blocked: '0',
    earned_by_others: {
      ...summary.earned_by_others,
      by_claim_family: {
        ...summary.earned_by_others.by_claim_family,
        REFERRAL_REV_SHARE: {
          ...family,
          held,
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        },
      },
    },
  };
}

const CASHBACK_AND_HELD = withTaxHeldIncome(
  earningsSummaryFixture({
    claimable: '5000000',
    cashbackClaimable: '5000000',
    held: '2000000',
  }),
);

const HELD_ONLY = withTaxHeldIncome(
  earningsSummaryFixture({
    claimable: '0',
    cashbackClaimable: '0',
    claimed: '0',
    held: '2000000',
  }),
);

function pageMessage(
  view: { props: { onMessage?: (event: unknown) => void } },
  type: string,
) {
  fireEvent(view, 'message', {
    nativeEvent: { data: JSON.stringify({ type }) },
  });
}

describe('EarningsTab tax documentation', () => {
  beforeEach(() => {
    postMessage.mockClear();
    clearMintRateLimit();
  });

  it('keeps Claim when the only balance is income held for tax', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
    });

    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('shows the attestation and still submits cashback, not income', async () => {
    const { findByTestId, engine } = renderEarningsTab({
      persona: 'referee',
      summary: CASHBACK_AND_HELD,
      claimReady: true,
      initiateClaim: 'hang',
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(ATTESTATION),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE),
    ).toHaveTextContent(COPY.taxAttestationTitle);
    await waitFor(() => {
      const claims = callsFor(engine, 'RewardsMoneyController:initiateClaim');
      expect(claims.map((call) => call[1])).toEqual([
        'referral-trade-fee-cashback',
      ]);
    });
  });

  it('opens the form after Yes', async () => {
    let tax = ATTESTATION;
    const { findByTestId, findByText } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(tax),
        'RewardsMoneyController:submitTaxAttestation': (value: unknown) => {
          expect(value).toBe(true);
          tax = OPEN_FORM;
          return Promise.resolve({ review: 'NONE' });
        },
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.YES));

    expect(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    ).toBeOnTheScreen();
    expect(await findByText(COPY.taxFormRequiredDescription)).toBeOnTheScreen();
    expect(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CHANGE_ANSWER),
    ).toBeOnTheScreen();
  });

  it('shows the not-needed toast after No', async () => {
    let tax = ATTESTATION;
    const { findByTestId, findByText, queryByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(tax),
        'RewardsMoneyController:submitTaxAttestation': (value: unknown) => {
          expect(value).toBe(false);
          tax = CLEARED;
          return Promise.resolve({ review: 'NONE' });
        },
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.NO));

    expect(await findByText(COPY.taxNotNeededToast)).toBeOnTheScreen();
    expect(
      queryByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('mints once from Continue and posts the token only to the page', async () => {
    const { findByTestId, engine } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
        'RewardsMoneyController:mintTaxFormToken': () =>
          Promise.resolve({ token: TOKEN, expires_at: '2026-12-01T00:00:00Z' }),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    );

    const webview = await findByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW);
    expect(webview.props.source.uri).toBe(FORM_URL);
    expect(String(webview.props.source.uri)).not.toContain(TOKEN);
    pageMessage(webview, 'tax-form:ready');

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'tax-form:token',
          token: TOKEN,
          expiresAt: '2026-12-01T00:00:00Z',
        }),
      );
    });
    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(1);
  });

  it('changes the answer without minting and then records No', async () => {
    let tax: TaxMeDto = OPEN_FORM;
    const { findByTestId, findByText, queryByTestId, engine } =
      renderEarningsTab({
        persona: 'referee',
        summary: HELD_ONLY,
        handlers: {
          'RewardsMoneyController:getTaxMe': () => Promise.resolve(tax),
          'RewardsMoneyController:submitTaxAttestation': () => {
            tax = CLEARED;
            return Promise.resolve({ review: 'NONE' });
          },
          'RewardsMoneyController:mintTaxFormToken': () =>
            Promise.resolve({
              token: TOKEN,
              expires_at: '2026-12-01T00:00:00Z',
            }),
        },
      });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CHANGE_ANSWER),
    );
    expect(
      queryByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    fireEvent.press(await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.NO));

    expect(await findByText(COPY.taxNotNeededToast)).toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(0);
  });

  it('hides Change my answer once the answer can no longer change', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () =>
          Promise.resolve({ ...OPEN_FORM, can_change_answer: false }),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CHANGE_ANSWER),
    ).not.toBeOnTheScreen();
  });

  it('replaces the form with the pending sheet after success', async () => {
    const { findByTestId, findByText, queryByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
        'RewardsMoneyController:mintTaxFormToken': () =>
          Promise.resolve({ token: TOKEN, expires_at: '2026-12-01T00:00:00Z' }),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    );
    pageMessage(
      await findByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW),
      'tax-form:success',
    );

    expect(await findByText(COPY.taxFormPendingTitle)).toBeOnTheScreen();
    expect(await findByText(COPY.taxFormPendingDescription)).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW),
    ).not.toBeOnTheScreen();
  });

  it('mints one replacement token and closes on the second expiry', async () => {
    let minted = 0;
    const { findByTestId, findByText, queryByTestId, engine } =
      renderEarningsTab({
        persona: 'referee',
        summary: HELD_ONLY,
        handlers: {
          'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
          'RewardsMoneyController:mintTaxFormToken': () => {
            minted += 1;
            return Promise.resolve({
              token: minted === 1 ? TOKEN : REMINTED,
              expires_at: '2026-12-01T00:00:00Z',
            });
          },
        },
      });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    );
    const webview = await findByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW);
    pageMessage(webview, 'tax-form:token-expired');

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        expect.stringContaining(REMINTED),
      );
    });
    pageMessage(webview, 'tax-form:token-expired');

    expect(await findByText(COPY.taxErrorToast)).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW),
    ).not.toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(2);
  });

  it('does not mint when the form URL is empty', async () => {
    const { findByTestId, findByText, engine } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      referralMe: {
        ...referralMeFixture('referee'),
        localized_text: { ...COPY, taxFormUrl: '' },
      },
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
        'RewardsMoneyController:mintTaxFormToken': () =>
          Promise.resolve({ token: TOKEN, expires_at: '2026-12-01T00:00:00Z' }),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    );

    expect(await findByText(COPY.taxDeterminationTitle)).toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(0);
  });

  it('shows the determination sheet for a provider 503 and does not retry', async () => {
    const { findByTestId, findByText, engine } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
        'RewardsMoneyController:mintTaxFormToken': () =>
          Promise.reject(
            new RewardsMoneyTaxError(503, 'TAX_PROVIDER_UNAVAILABLE', 30),
          ),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    );

    expect(await findByText(COPY.taxDeterminationTitle)).toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(1);
  });

  it('keeps Continue disabled after the sheet is closed until Retry-After elapses', async () => {
    const { findByTestId, findAllByText, queryByTestId, engine } =
      renderEarningsTab({
        persona: 'referee',
        summary: HELD_ONLY,
        handlers: {
          'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
          'RewardsMoneyController:mintTaxFormToken': () =>
            Promise.reject(new RewardsMoneyTaxError(429, 'RATE_LIMITED', 120)),
        },
      });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
    );
    expect(
      await findAllByText('You can open the tax form again in 2 minutes.'),
    ).toHaveLength(2);
    expect(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.RATE_LIMIT),
    ).toHaveTextContent('You can open the tax form again in 2 minutes.');

    fireEvent.press(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.NOT_NOW),
    );
    await waitFor(() => {
      expect(
        queryByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE),
      ).toBeNull();
    });
    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    const continueAgain = await findByTestId(
      TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE,
    );
    expect(continueAgain.props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.RATE_LIMIT),
    ).toHaveTextContent('You can open the tax form again in 2 minutes.');
    fireEvent.press(continueAgain);

    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(1);
  });

  it('rate-limits Continue for the rest of the sheet visit', async () => {
    const { findByTestId, engine } = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(OPEN_FORM),
        'RewardsMoneyController:mintTaxFormToken': () =>
          Promise.reject(new RewardsMoneyTaxError(429, 'RATE_LIMITED', 120)),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    const continueButton = await findByTestId(
      TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE,
    );
    fireEvent.press(continueButton);

    expect(
      await findByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.RATE_LIMIT),
    ).toHaveTextContent('You can open the tax form again in 2 minutes.');
    const limitedContinue = await findByTestId(
      TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE,
    );
    expect(limitedContinue.props.accessibilityState).toMatchObject({
      disabled: true,
    });
    fireEvent.press(limitedContinue);
    expect(
      callsFor(engine, 'RewardsMoneyController:mintTaxFormToken'),
    ).toHaveLength(1);
  });

  it('opens support from the US activity block', async () => {
    const view = renderEarningsTab({
      persona: 'referee',
      summary: HELD_ONLY,
      supportPreferenceSaved: true,
      handlers: {
        'RewardsMoneyController:getTaxMe': () =>
          Promise.resolve(
            taxMe({
              state: 'UNDER_REVIEW',
              next_action: 'NONE',
              reason: 'US_ACTIVITY_BLOCKED',
            }),
          ),
      },
    });
    ReduxService.store = view.store;

    fireEvent.press(
      await view.findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );
    fireEvent.press(
      await view.findByTestId(TAX_FORM_CONTACT_US_SHEET_TEST_IDS.CONTACT),
    );

    expect(
      await view.findByTestId(getRouteParamsProbeTestId(Routes.WEBVIEW.SIMPLE)),
    ).toBeOnTheScreen();
  });

  it('claims and shows the renewal question when the answer is about to expire', async () => {
    const { findByTestId, findByText, engine } = renderEarningsTab({
      persona: 'referee',
      summary: CASHBACK_AND_HELD,
      claimReady: true,
      initiateClaim: 'hang',
      handlers: {
        'RewardsMoneyController:getTaxMe': () =>
          Promise.resolve(
            taxMe({
              state: 'RENEWAL_REQUIRED',
              next_action: 'ANSWER_ATTESTATION',
              reason: null,
              cleared: true,
            }),
          ),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByText(COPY.taxRenewalAttestationDescription),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:initiateClaim'),
      ).toHaveLength(1);
    });
  });

  it('opens the tax sheet when the claim is refused for tax documentation', async () => {
    let tax = CLEARED;
    const { findByTestId, queryByTestId, engine } = renderEarningsTab({
      persona: 'referee',
      summary: CASHBACK_AND_HELD,
      claimReady: true,
      handlers: {
        'RewardsMoneyController:getTaxMe': () => Promise.resolve(tax),
        'RewardsMoneyController:initiateClaim': () => {
          tax = ATTESTATION;
          return Promise.reject(
            new RewardsMoneyClaimRefusalError(
              422,
              'TAX_DETERMINATION_REQUIRED',
            ),
          );
        },
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE),
    ).toHaveTextContent(COPY.taxAttestationTitle);
    expect(
      queryByTestId(
        getRouteParamsProbeTestId(
          Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        ),
      ),
    ).not.toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(1);
  });

  it('still opens the paused sheet for a refusal that is not tax', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: CASHBACK_AND_HELD,
      claimReady: true,
      initiateClaim: 'under_review',
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(
          Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});

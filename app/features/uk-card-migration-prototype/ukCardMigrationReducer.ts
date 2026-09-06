export const MIGRATION_STEPS = [
  'dashboard',
  'intro',
  'get-started',
  'sumsub-camera',
  'sumsub-face',
  'sumsub-check',
  'sumsub-data',
  'sumsub-approved',
  'awaiting-approval',
  'funding-source',
  'wallet-permission',
  'move-balance',
  'card-creation',
  'card-ready',
] as const;

export type MigrationStep = (typeof MIGRATION_STEPS)[number];

export interface MigrationState {
  step: MigrationStep;
  migrationComplete: boolean;
  authSheetOpen: boolean;
  detailsSheetOpen: boolean;
  cvvVisible: boolean;
  copied: boolean;
  walletExpanded: boolean;
  passwordMode: boolean;
  passwordError: boolean;
  balanceMoved: boolean;
  cardFrozen: boolean;
  events: string[];
}

export type MigrationAction =
  | { type: 'NEXT' }
  | { type: 'JUMP'; step: MigrationStep }
  | { type: 'RESET' }
  | { type: 'OPEN_AUTH' }
  | { type: 'REQUEST_FACE_ID' }
  | { type: 'REQUEST_PASSWORD' }
  | { type: 'SUBMIT_PASSWORD'; password: string }
  | { type: 'CLOSE_SHEETS' }
  | { type: 'TOGGLE_CVV' }
  | { type: 'COPY_CARD_NUMBER' }
  | { type: 'TOGGLE_WALLET_ADDRESS' }
  | { type: 'SKIP_BALANCE' }
  | { type: 'CARD_CREATED' }
  | { type: 'TOGGLE_FREEZE' }
  | { type: 'VIEW_HISTORY' };

export const initialMigrationState: MigrationState = {
  step: 'dashboard',
  migrationComplete: false,
  authSheetOpen: false,
  detailsSheetOpen: false,
  cvvVisible: false,
  copied: false,
  walletExpanded: false,
  passwordMode: false,
  passwordError: false,
  balanceMoved: false,
  cardFrozen: false,
  events: ['prototype_opened'],
};

const appendEvent = (state: MigrationState, event: string) => ({
  ...state,
  events: [...state.events, event],
});

export function ukCardMigrationReducer(
  state: MigrationState,
  action: MigrationAction,
): MigrationState {
  switch (action.type) {
    case 'NEXT': {
      const currentIndex = MIGRATION_STEPS.indexOf(state.step);
      const nextStep =
        currentIndex === MIGRATION_STEPS.length - 1
          ? 'dashboard'
          : MIGRATION_STEPS[currentIndex + 1];
      const next = {
        ...state,
        step: nextStep,
        balanceMoved:
          state.balanceMoved ||
          (state.step === 'move-balance' && nextStep === 'card-creation'),
        migrationComplete:
          state.migrationComplete || state.step === 'card-ready',
      };
      if (nextStep === 'sumsub-camera') return appendEvent(next, 'sumsub_started');
      if (nextStep === 'sumsub-approved') return appendEvent(next, 'sumsub_approved');
      if (nextStep === 'card-creation') {
        return appendEvent(next, 'card_creation_started');
      }
      return appendEvent(next, `advanced_to_${nextStep}`);
    }
    case 'JUMP':
      return appendEvent(
        {
          ...state,
          step: action.step,
          migrationComplete:
            state.migrationComplete || action.step === 'card-ready',
          authSheetOpen: false,
          detailsSheetOpen: false,
        },
        `jumped_to_${action.step}`,
      );
    case 'OPEN_AUTH':
      return appendEvent(
        { ...state, authSheetOpen: true, passwordMode: false, passwordError: false },
        'card_details_auth_requested',
      );
    case 'REQUEST_FACE_ID':
      return appendEvent(
        appendEvent(
          {
            ...state,
            authSheetOpen: false,
            detailsSheetOpen: true,
          },
          'card_details_face_id_requested',
        ),
        'card_details_viewed',
      );
    case 'REQUEST_PASSWORD':
      return { ...state, passwordMode: true, passwordError: false };
    case 'SUBMIT_PASSWORD':
      if (!action.password.trim()) {
        return { ...state, passwordError: true };
      }
      return appendEvent(
        appendEvent(
          {
            ...state,
            authSheetOpen: false,
            detailsSheetOpen: true,
            passwordMode: false,
            passwordError: false,
          },
          'card_details_password_requested',
        ),
        'card_details_viewed',
      );
    case 'CLOSE_SHEETS':
      return appendEvent(
        { ...state, authSheetOpen: false, detailsSheetOpen: false },
        'sheet_closed',
      );
    case 'TOGGLE_CVV':
      return appendEvent(
        { ...state, cvvVisible: !state.cvvVisible },
        state.cvvVisible ? 'cvv_hidden' : 'cvv_revealed',
      );
    case 'COPY_CARD_NUMBER':
      return appendEvent({ ...state, copied: true }, 'card_number_copied');
    case 'TOGGLE_WALLET_ADDRESS':
      return { ...state, walletExpanded: !state.walletExpanded };
    case 'SKIP_BALANCE':
      return appendEvent(
        { ...state, step: 'card-creation', balanceMoved: false },
        'card_creation_started',
      );
    case 'CARD_CREATED':
      return appendEvent(
        { ...state, step: 'card-ready', migrationComplete: true },
        'card_created',
      );
    case 'TOGGLE_FREEZE':
      return appendEvent(
        { ...state, cardFrozen: !state.cardFrozen },
        state.cardFrozen ? 'card_unfrozen' : 'card_frozen',
      );
    case 'VIEW_HISTORY':
      return appendEvent(state, 'transaction_history_requested');
    case 'RESET':
      return { ...initialMigrationState, events: ['prototype_reset'] };
    default:
      return state;
  }
}
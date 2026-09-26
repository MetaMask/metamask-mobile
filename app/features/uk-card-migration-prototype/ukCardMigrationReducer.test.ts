import {
  initialMigrationState,
  MIGRATION_STEPS,
  ukCardMigrationReducer,
} from './ukCardMigrationReducer';

describe('ukCardMigrationReducer', () => {
  it('advances through every migration stage and returns to the dashboard', () => {
    let state = initialMigrationState;

    MIGRATION_STEPS.slice(1).forEach((step) => {
      state = ukCardMigrationReducer(state, { type: 'NEXT' });
      expect(state.step).toBe(step);
    });

    state = ukCardMigrationReducer(state, { type: 'NEXT' });
    expect(state.step).toBe('dashboard');
    expect(state.migrationComplete).toBe(true);
  });

  it('protects details behind authentication and handles sensitive fields', () => {
    let state = ukCardMigrationReducer(initialMigrationState, {
      type: 'OPEN_AUTH',
    });
    expect(state.authSheetOpen).toBe(true);
    expect(state.detailsSheetOpen).toBe(false);

    state = ukCardMigrationReducer(state, {
      type: 'REQUEST_PASSWORD',
    });
    expect(state.passwordMode).toBe(true);
    state = ukCardMigrationReducer(state, {
      type: 'SUBMIT_PASSWORD',
      password: '',
    });
    expect(state.passwordError).toBe(true);
    expect(state.detailsSheetOpen).toBe(false);

    state = ukCardMigrationReducer(state, {
      type: 'SUBMIT_PASSWORD',
      password: 'not-a-real-password',
    });
    expect(state.authSheetOpen).toBe(false);
    expect(state.detailsSheetOpen).toBe(true);
    expect(state.events).toContain('card_details_password_requested');
    expect(state.events).toContain('card_details_viewed');

    state = ukCardMigrationReducer(state, { type: 'TOGGLE_CVV' });
    state = ukCardMigrationReducer(state, { type: 'COPY_CARD_NUMBER' });
    expect(state.cvvVisible).toBe(true);
    expect(state.copied).toBe(true);
  });

  it('starts automatic card creation for move and skip decisions', () => {
    const moving = ukCardMigrationReducer(
      { ...initialMigrationState, step: 'move-balance' },
      { type: 'NEXT' },
    );
    const skipped = ukCardMigrationReducer(
      { ...initialMigrationState, step: 'move-balance' },
      { type: 'SKIP_BALANCE' },
    );
    expect(moving.events).toContain('card_creation_started');
    expect(moving.balanceMoved).toBe(true);
    expect(skipped.events).toContain('card_creation_started');
    expect(skipped.balanceMoved).toBe(false);

    const created = ukCardMigrationReducer(skipped, { type: 'CARD_CREATED' });
    expect(created.step).toBe('card-ready');
    expect(created.events).toContain('card_created');
  });

  it('supports direct jumps and reset for development', () => {
    const jumped = ukCardMigrationReducer(initialMigrationState, {
      type: 'JUMP',
      step: 'move-balance',
    });
    expect(jumped.step).toBe('move-balance');
    expect(jumped.events.at(-1)).toBe('jumped_to_move-balance');

    expect(ukCardMigrationReducer(jumped, { type: 'RESET' })).toEqual({
      ...initialMigrationState,
      events: ['prototype_reset'],
    });
  });
});
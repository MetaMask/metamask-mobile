import { Messenger } from '@metamask/messenger';
import { CardController, defaultCardControllerState } from './CardController';
import { type CardControllerActions, type CardControllerEvents } from './types';

function buildMessenger() {
  return new Messenger<
    'CardController',
    CardControllerActions,
    CardControllerEvents
  >({ namespace: 'CardController' });
}

describe('CardController', () => {
  it('initializes with default state when no state is provided', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
    });

    expect(controller.state).toStrictEqual(defaultCardControllerState);
  });

  it('initializes with provided state merged over defaults', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      state: {
        selectedCountry: 'US',
        activeProviderId: 'baanx',
        isAuthenticated: true,
      },
    });

    expect(controller.state).toStrictEqual({
      selectedCountry: 'US',
      activeProviderId: 'baanx',
      isAuthenticated: true,
      cardholderAccounts: [],
      providerData: {},
    });
  });

  it('preserves default values for fields not in partial state', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      state: {
        selectedCountry: 'GB',
      },
    });

    expect(controller.state.selectedCountry).toBe('GB');
    expect(controller.state.activeProviderId).toBeNull();
    expect(controller.state.isAuthenticated).toBe(false);
    expect(controller.state.cardholderAccounts).toStrictEqual([]);
    expect(controller.state.providerData).toStrictEqual({});
  });

  it('initializes with full persisted state including providerData', () => {
    const controller = new CardController({
      messenger: buildMessenger(),
      state: {
        selectedCountry: 'US',
        activeProviderId: 'baanx',
        isAuthenticated: true,
        cardholderAccounts: ['eip155:1:0xabc'],
        providerData: {
          baanx: { location: 'us' },
        },
      },
    });

    expect(controller.state.cardholderAccounts).toStrictEqual([
      'eip155:1:0xabc',
    ]);
    expect(controller.state.providerData).toStrictEqual({
      baanx: { location: 'us' },
    });
  });
});

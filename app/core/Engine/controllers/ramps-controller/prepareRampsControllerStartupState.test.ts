import {
  getDefaultRampsControllerState,
  type Country,
  type RampsControllerState,
  type UserRegion,
} from '@metamask/ramps-controller';
import { prepareRampsControllerStartupState } from './prepareRampsControllerStartupState';

const createMockCountry = (): Country => ({
  isoCode: 'US',
  id: '/regions/us',
  flag: '🇺🇸',
  name: 'United States',
  phone: {
    prefix: '+1',
    placeholder: '201 555 0123',
    template: 'XXX XXX XXXX',
  },
  currency: 'USD',
  supported: { buy: true, sell: true },
  defaultAmount: 100,
  quickAmounts: [100, 250, 500],
});

const createMockUserRegion = (): UserRegion => ({
  country: createMockCountry(),
  state: null,
  regionCode: 'us',
});

const createPersistedState = (): RampsControllerState => {
  const defaultState = getDefaultRampsControllerState();

  return {
    ...defaultState,
    userRegion: createMockUserRegion(),
    countries: {
      data: [createMockCountry()],
      selected: null,
      isLoading: false,
      error: null,
    },
  };
};

describe('prepareRampsControllerStartupState', () => {
  it('matches snapshot when no persisted state is provided', () => {
    expect(prepareRampsControllerStartupState(undefined)).toMatchSnapshot();
  });

  it('discards persisted countries while keeping other persisted fields', () => {
    const persistedState = createPersistedState();

    expect(prepareRampsControllerStartupState(persistedState)).toMatchSnapshot();
  });
});

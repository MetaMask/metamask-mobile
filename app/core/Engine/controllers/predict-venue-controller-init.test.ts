import {
  getDefaultGeolocationControllerState,
  type GeolocationControllerState,
} from '@metamask/geolocation-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { PredictVenueControllerMessenger } from '../../../components/UI/PredictNext/implementation/PredictVenueController';
import type { RootState } from '../../../reducers';
import { store } from '../../../store';
import { getPredictVenueControllerMessenger } from '../messengers/predict-venue-controller-messenger';
import type {
  MessengerClientInitRequest,
  RootExtendedMessenger,
} from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { predictVenueControllerInit } from './predict-venue-controller-init';

jest.mock('../../../store', () => ({
  store: { subscribe: jest.fn() },
}));
jest.mock('../../../util/Logger');

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PredictVenueControllerMessenger>,
  MessengerEvents<PredictVenueControllerMessenger>
>;

const stateWith = (sessionDefaultReady: boolean) =>
  ({
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            predictConfig: {
              enabled: true,
              venues: {
                polymarket: { enabled: true },
                kalshi: { enabled: true },
              },
              venueSelection: { enabled: true },
            },
          },
        },
        PredictVenueController: {
          venueSelectionPreference: null,
          lastActiveVenue: null,
          sessionDefault: sessionDefaultReady
            ? { venue: 'kalshi', source: 'geolocation' }
            : null,
        },
      },
    },
  }) as unknown as RootState;

const setup = (
  geolocation: Partial<GeolocationControllerState>,
  persistedState: MessengerClientInitRequest<PredictVenueControllerMessenger>['persistedState'] = {},
) => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  rootMessenger.registerActionHandler('GeolocationController:getState', () => ({
    ...getDefaultGeolocationControllerState(),
    ...geolocation,
  }));
  const getState = jest.fn<RootState, []>();
  const request = {
    ...buildMessengerClientInitRequestMock(
      rootMessenger as unknown as RootExtendedMessenger,
    ),
    controllerMessenger: getPredictVenueControllerMessenger(rootMessenger),
    getState,
    persistedState,
  } as unknown as MessengerClientInitRequest<PredictVenueControllerMessenger>;
  return { request, getState };
};

describe('predictVenueControllerInit', () => {
  beforeEach(() => {
    jest.mocked(store.subscribe).mockClear();
  });

  it('hydrates the persisted Venue history', () => {
    const { request } = setup(
      { status: 'complete', location: 'GB' },
      {
        PredictVenueController: {
          venueSelectionPreference: 'kalshi',
          lastActiveVenue: 'kalshi',
        },
      },
    );

    const { controller } = predictVenueControllerInit(request);

    expect(controller.state).toEqual({
      venueSelectionPreference: 'kalshi',
      lastActiveVenue: 'kalshi',
      sessionDefault: { venue: 'polymarket', source: 'geolocation' },
    });
  });

  it('records each Active Venue the store resolves', () => {
    const { request, getState } = setup({ status: 'complete', location: 'US' });
    const { controller } = predictVenueControllerInit(request);
    const onStoreChange = jest.mocked(store.subscribe).mock.calls[0][0];

    getState.mockReturnValue(stateWith(false));
    onStoreChange();
    const whileResolving = controller.state.lastActiveVenue;
    getState.mockReturnValue(stateWith(true));
    onStoreChange();

    expect(whileResolving).toBeNull();
    expect(controller.state.lastActiveVenue).toBe('kalshi');
  });
});

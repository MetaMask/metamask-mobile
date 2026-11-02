import {
  getDefaultGeolocationControllerState,
  type GeolocationControllerGetGeolocationAction,
} from '@metamask/geolocation-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { PredictVenueControllerMessenger } from '../../../components/UI/PredictNext/implementation/PredictVenueController';
import { getPredictVenueControllerMessenger } from './predict-venue-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<PredictVenueControllerMessenger>
  | GeolocationControllerGetGeolocationAction,
  MessengerEvents<PredictVenueControllerMessenger>
>;

describe('getPredictVenueControllerMessenger', () => {
  it('reads GeolocationController state and its changes', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const geolocationState = getDefaultGeolocationControllerState();
    rootMessenger.registerActionHandler(
      'GeolocationController:getState',
      () => geolocationState,
    );
    const messenger = getPredictVenueControllerMessenger(rootMessenger);
    const onChange = jest.fn();

    messenger.subscribe('GeolocationController:stateChange', onChange);
    rootMessenger.publish(
      'GeolocationController:stateChange',
      geolocationState,
      [],
    );

    expect(messenger.call('GeolocationController:getState')).toBe(
      geolocationState,
    );
    expect(onChange).toHaveBeenCalledWith(geolocationState, []);
  });

  it('cannot start a geolocation fetch', () => {
    const rootMessenger: RootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });
    rootMessenger.registerActionHandler(
      'GeolocationController:getGeolocation',
      jest.fn(),
    );
    const messenger = getPredictVenueControllerMessenger(rootMessenger);

    expect(() =>
      (
        messenger as unknown as Messenger<
          'PredictVenueController',
          GeolocationControllerGetGeolocationAction
        >
      ).call('GeolocationController:getGeolocation'),
    ).toThrow();
  });
});

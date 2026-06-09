import {
  GatorPermissionsController,
  type GatorPermissionsControllerState,
} from '@metamask/gator-permissions-controller';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import type { MessengerClientInitRequest } from '../../types';
import {
  getGatorPermissionsControllerMessenger,
  GatorPermissionsControllerMessenger,
} from '../../messengers/gator-permissions-controller-messenger/gator-permissions-controller-messenger';
import { GatorPermissionsControllerInit } from './gator-permissions-controller-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/gator-permissions-controller');

function buildInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<GatorPermissionsControllerMessenger>
> {
  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseControllerMessenger),
    controllerMessenger: getGatorPermissionsControllerMessenger(
      baseControllerMessenger,
    ),
    initMessenger: undefined,
  };
}

describe('GatorPermissionsControllerInit', () => {
  const MOCK_GATOR_PERMISSIONS_PROVIDER_SNAP_ID = 'npm:mock-snap-id';
  const GatorPermissionsControllerClassMock = jest.mocked(
    GatorPermissionsController,
  );
  const originalGatorPermissionProviderSnapId =
    process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID =
      MOCK_GATOR_PERMISSIONS_PROVIDER_SNAP_ID;
  });

  afterEach(() => {
    if (originalGatorPermissionProviderSnapId) {
      process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID =
        originalGatorPermissionProviderSnapId;
    } else {
      delete process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID;
    }
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(
      GatorPermissionsControllerInit(requestMock).controller,
    ).toBeInstanceOf(GatorPermissionsController);
  });

  it('initializes with messenger, config including provider snap id, and persisted state', () => {
    const requestMock = buildInitRequestMock();
    const persisted: GatorPermissionsControllerState = {
      grantedPermissions: [],
      isFetchingGatorPermissions: false,
      pendingRevocations: [],
      lastSyncedTimestamp: -1,
    };
    requestMock.persistedState.GatorPermissionsController = persisted;

    GatorPermissionsControllerInit(requestMock);

    expect(GatorPermissionsControllerClassMock).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      config: {
        supportedPermissionTypes: [],
        gatorPermissionsProviderSnapId: MOCK_GATOR_PERMISSIONS_PROVIDER_SNAP_ID,
      },
      state: persisted,
    });
  });

  it('initializes with undefined state when persistedState.GatorPermissionsController is missing', () => {
    const requestMock = buildInitRequestMock();

    GatorPermissionsControllerInit(requestMock);

    expect(GatorPermissionsControllerClassMock).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      config: {
        supportedPermissionTypes: [],
        gatorPermissionsProviderSnapId: MOCK_GATOR_PERMISSIONS_PROVIDER_SNAP_ID,
      },
      state: undefined,
    });
  });

  it('omits gatorPermissionsProviderSnapId from config when env is not set', () => {
    const requestMock = buildInitRequestMock();

    delete process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID;

    GatorPermissionsControllerInit(requestMock);

    expect(GatorPermissionsControllerClassMock).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      config: {
        supportedPermissionTypes: [],
      },
      state: undefined,
    });

    const calledWithConfig =
      GatorPermissionsControllerClassMock.mock.calls[0][0].config;

    expect(
      Object.prototype.hasOwnProperty.call(
        calledWithConfig,
        'gatorPermissionsProviderSnapId',
      ),
    ).toBe(false);
  });

  describe('GATOR_PERMISSIONS_PROVIDER_SNAP_ID incorrectly specified', () => {
    ['', '   ', 'invalid-snap-id'].forEach((invalidSnapId) => {
      it(`throws when provided invalid GATOR_PERMISSIONS_PROVIDER_SNAP_ID: ${invalidSnapId}`, () => {
        const requestMock = buildInitRequestMock();

        process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID =
          invalidSnapId as string;

        expect(() => GatorPermissionsControllerInit(requestMock)).toThrow(
          'GATOR_PERMISSIONS_PROVIDER_SNAP_ID must be set to a valid snap id',
        );

        expect(GatorPermissionsControllerClassMock).not.toHaveBeenCalled();
      });
    });
  });
});

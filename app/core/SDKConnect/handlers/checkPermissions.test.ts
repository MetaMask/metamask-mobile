/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import Engine from '../../Engine';
import { Connection } from '../Connection';
import checkPermissions from './checkPermissions';
jest.mock('../Connection', () => ({
  RPC_METHODS: jest.requireActual('../Connection').RPC_METHODS,
}));
jest.mock('../../Engine');
jest.mock('@metamask/preferences-controller');
jest.mock('@metamask/approval-controller');
jest.mock('../utils/DevLogger');

describe('checkPermissions', () => {
  let connection = {} as unknown as Connection;
  let engine = {
    context: {},
  } as unknown as typeof Engine;
  let preferencesController = {} as unknown as PreferencesController;
  let approvalController = {} as unknown as ApprovalController;

  const HOUR_IN_MS = 3600000;
  const currentTime = Date.now();

  const mockIsApproved = jest.fn();
  const mockRevalidate = jest.fn();
  const mockAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(currentTime);

    connection = {
      channelId: 'channelId',
      isApproved: mockIsApproved,
      revalidate: mockRevalidate,
      initialConnection: true,
    } as unknown as Connection;

    engine = {
      context: {},
    } as unknown as typeof Engine;
    preferencesController = {
      state: {
        selectedAddress: '',
      },
    } as unknown as PreferencesController;
    approvalController = {
      add: mockAdd,
    } as unknown as ApprovalController;

    // @ts-ignore
    engine.context = {
      PreferencesController: preferencesController,
      ApprovalController: approvalController,
    };
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return true if the connection is already approved and a selected address exists', async () => {
    mockIsApproved.mockReturnValue(true);
    preferencesController.state.selectedAddress = '0x123';

    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(true);
  });

  it('should handle approval if the connection is not initially approved', async () => {
    mockIsApproved.mockReturnValue(false);

    await checkPermissions({ connection, engine });
    expect(mockAdd).toHaveBeenCalled();
  });

  it('should return true if the connection is not initially approved and a deeplink origin exists', async () => {
    mockIsApproved.mockReturnValue(false);
    connection.initialConnection = false;

    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(true);
  });

  it('should revalidate the connection if the channel was active recently', async () => {
    const lastAuthorized = currentTime - HOUR_IN_MS / 2;
    mockIsApproved.mockReturnValue(false);

    const result = await checkPermissions({
      connection,
      engine,
      lastAuthorized,
    });
    expect(result).toBe(true);
  });

  it('should handle when approvalPromise already exists', async () => {
    mockIsApproved.mockReturnValue(false);
    connection.approvalPromise = Promise.resolve();

    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(true);
  });

  it('should revalidate connection if not an initial connection and a deeplink origin exists', async () => {
    connection.initialConnection = false;

    await checkPermissions({ connection, engine });
    expect(connection.revalidate).toHaveBeenCalledWith({
      channelId: connection.channelId,
    });
  });

  it('should call approvalPromise if it exists and is NOT approved', async () => {
    mockIsApproved.mockReturnValue(false);
    connection.approvalPromise = Promise.resolve();

    await checkPermissions({ connection, engine });
    expect(connection.approvalPromise).toBe(undefined);
  });
});

import {
  CronjobController,
  type CronjobControllerMessenger,
  CronjobControllerState,
} from '@metamask/snaps-controllers';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { cronjobControllerInit } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/snaps-controllers');

describe('cronjob controller init', () => {
  const cronjobControllerClassMock = jest.mocked(CronjobController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<CronjobControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(cronjobControllerInit(initRequestMock).controller).toBeInstanceOf(
      CronjobController,
    );
  });

  it('controller state should be undefined when no initial state is passed in', () => {
    cronjobControllerInit(initRequestMock);
    const cronjobControllerState =
      cronjobControllerClassMock.mock.calls[0][0].state;
    expect(cronjobControllerState).toBeUndefined();
  });

  it('controller state should be initial state when initial state is passed in', () => {
    // Create initial state
    const initialCronjobControllerState: CronjobControllerState = {
      jobs: {},
      events: {},
    };
    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      CronjobController: initialCronjobControllerState,
    };
    cronjobControllerInit(initRequestMock);
    const cronjobControllerState =
      cronjobControllerClassMock.mock.calls[0][0].state;
    expect(cronjobControllerState).toEqual(initialCronjobControllerState);
  });
});

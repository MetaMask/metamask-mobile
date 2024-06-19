import { useState } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import {
  enableProfileSyncingRequest,
  disableProfileSyncingRequest,
} from '../../../actions/notification/pushNotifications';
import {
  useEnableProfileSyncing,
  useDisableProfileSyncing,
} from './useProfileSyncing';
import { AppDispatch } from '../../../store';

const useDispatchMock = useDispatch as jest.Mock<AppDispatch>;

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));

jest.mock('../../../actions/notification/pushNotifications', () => ({
  enableProfileSyncingRequest: jest.fn(),
  disableProfileSyncingRequest: jest.fn(),
}));

describe('useEnableProfileSyncing', () => {
  const dispatch = jest.fn();
  const enableProfileSyncingRequestMock =
    enableProfileSyncingRequest as jest.Mock;
  const setError = jest.fn();
  const useStateMock = jest.mocked(useState);
  useStateMock.mockImplementation(() => [undefined, setError]);

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should enable profile syncing', () => {
    renderHook(() =>
      useEnableProfileSyncing(),
    ).result.current.enableProfileSyncing();

    expect(dispatch).toHaveBeenCalledWith(enableProfileSyncingRequest());
    expect(setError).not.toHaveBeenCalled();
  });

  it('should set error state if an error occurs while enabling profile syncing', () => {
    const errorMessage = 'Failed to enable profile syncing';
    enableProfileSyncingRequestMock.mockRejectedValue(new Error(errorMessage));

    renderHook(() =>
      useEnableProfileSyncing(),
    ).result.current.enableProfileSyncing();

    expect(dispatch).toHaveBeenCalledWith(enableProfileSyncingRequest());
    expect(setError).toHaveBeenCalledWith(errorMessage);
  });
});

describe('useDisableProfileSyncing', () => {
  const dispatch = jest.fn();
  const disableProfileSyncingRequestMock =
    disableProfileSyncingRequest as jest.Mock;
  const setError = jest.fn();
  const useStateMock = jest.mocked(useState);
  useStateMock.mockImplementation(() => [undefined, setError]);

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should disable profile syncing', () => {
    renderHook(() =>
      useDisableProfileSyncing(),
    ).result.current.disableProfileSyncing();

    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncingRequest());
    expect(setError).not.toHaveBeenCalled();
  });

  it('should set error state if an error occurs while disabling profile syncing', () => {
    const errorMessage = 'Failed to disable profile syncing';
    disableProfileSyncingRequestMock.mockRejectedValue(new Error(errorMessage));

    renderHook(() =>
      useDisableProfileSyncing(),
    ).result.current.disableProfileSyncing();

    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncingRequest());
    expect(setError).toHaveBeenCalledWith(errorMessage);
  });
});

import {
  ApprovalController,
  ApprovalControllerMessenger,
} from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';

import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { ApprovalControllerInit } from './approval-controller-init';
import { ApprovalTypes } from '../../../RPCMethods/RPCMethodMiddleware';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';

jest.mock('@metamask/approval-controller');

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<ControllerInitRequest<ApprovalControllerMessenger>> {
  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  return {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    controllerMessenger:
      baseControllerMessenger as unknown as ApprovalControllerMessenger,
    ...initRequestProperties,
  };
}

describe('ApprovalController Init', () => {
  const approvalControllerClassMock = jest.mocked(ApprovalController);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(ApprovalControllerInit(requestMock).controller).toBeInstanceOf(
      ApprovalController,
    );
  });

  it('throws error if controller initialization fails', () => {
    approvalControllerClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    expect(() => ApprovalControllerInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('ApprovalController constructor options', () => {
    it('correctly sets up constructor options', () => {
      const requestMock = buildInitRequestMock();

      ApprovalControllerInit(requestMock);

      const constructorOptions = approvalControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.messenger).toBe(
        requestMock.controllerMessenger,
      );
      expect(constructorOptions.showApprovalRequest).toBeDefined();
      expect(constructorOptions.showApprovalRequest()).toBeUndefined();
      expect(constructorOptions.typesExcludedFromRateLimiting).toEqual([
        ApprovalType.Transaction,
        ApprovalType.WatchAsset,
        ApprovalTypes.SMART_TRANSACTION_STATUS,
        DIALOG_APPROVAL_TYPES.default,
      ]);
    });

    it('showApprovalRequest returns undefined', () => {
      const requestMock = buildInitRequestMock();

      ApprovalControllerInit(requestMock);

      const constructorOptions = approvalControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.showApprovalRequest()).toBeUndefined();
    });
  });
});

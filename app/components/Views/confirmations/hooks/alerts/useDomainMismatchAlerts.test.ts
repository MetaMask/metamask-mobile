import { isValidSIWEOrigin } from '@metamask/controller-utils';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { isSIWESignatureRequest } from '../../utils/signature';
import useDomainMismatchAlerts from './useDomainMismatchAlerts';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { siweSignatureConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { AlertKeys } from '../../constants/alerts';

jest.mock('@metamask/controller-utils');
jest.mock('../../utils/signature');

describe('useDomainMismatchAlerts', () => {
  const ALERT_MOCK = {
    field: RowAlertKey.RequestFrom,
    key: AlertKeys.DomainMismatch,
    message:
      "The site making the request is not the site you're signing into. This could be an attempt to steal your login credentials.",
    title: 'Suspicious sign-in request',
    severity: Severity.Danger,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when there is no domain mismatch', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when the SIWE origin is valid', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    (isValidSIWEOrigin as jest.Mock).mockReturnValue(true);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([]);
  });

  it('returns an alert when there is a domain mismatch', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    (isValidSIWEOrigin as jest.Mock).mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(ALERT_MOCK);
  });

  it('uses meta.url when requestData.origin does not have a protocol', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([ALERT_MOCK]);
  });

  it('uses requestData.origin when it has a protocol', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: {
        ...siweSignatureConfirmationState,
        engine: {
          ...siweSignatureConfirmationState.engine,
          backgroundState: {
            ...siweSignatureConfirmationState.engine.backgroundState,
            ApprovalController: {
              ...siweSignatureConfirmationState.engine.backgroundState
                .ApprovalController,
              pendingApprovals: {
                ...siweSignatureConfirmationState.engine.backgroundState
                  .ApprovalController.pendingApprovals,
                '72424261-e22f-11ef-8e59-bf627a5d8354': {
                  ...siweSignatureConfirmationState.engine.backgroundState
                    .ApprovalController.pendingApprovals[
                    '72424261-e22f-11ef-8e59-bf627a5d8354'
                  ],
                  origin: 'https://metamask.github.io',
                  requestData: {
                    ...siweSignatureConfirmationState.engine.backgroundState
                      .ApprovalController.pendingApprovals[
                      '72424261-e22f-11ef-8e59-bf627a5d8354'
                    ].requestData,
                    origin: 'https://metamask.github.io',
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(result.current).toEqual([ALERT_MOCK]);
  });

  it('falls back to requestData.origin when new URL(meta?.url) throws an error', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    const ORIGIN_MOCK = 'https://metamask.github.io';
    const META_URL_MOCK = 'invalid-url';

    const consoleWarnSpy = jest.spyOn(console, 'warn');

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: {
        ...siweSignatureConfirmationState,
        engine: {
          ...siweSignatureConfirmationState.engine,
          backgroundState: {
            ...siweSignatureConfirmationState.engine.backgroundState,
            ApprovalController: {
              ...siweSignatureConfirmationState.engine.backgroundState
                .ApprovalController,
              pendingApprovals: {
                ...siweSignatureConfirmationState.engine.backgroundState
                  .ApprovalController.pendingApprovals,
                '72424261-e22f-11ef-8e59-bf627a5d8354': {
                  ...siweSignatureConfirmationState.engine.backgroundState
                    .ApprovalController.pendingApprovals[
                    '72424261-e22f-11ef-8e59-bf627a5d8354'
                  ],
                  origin: ORIGIN_MOCK,
                  requestData: {
                    ...siweSignatureConfirmationState.engine.backgroundState
                      .ApprovalController.pendingApprovals[
                      '72424261-e22f-11ef-8e59-bf627a5d8354'
                    ].requestData,
                    origin: ORIGIN_MOCK,
                    meta: {
                      url: META_URL_MOCK,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'useDomainMismatchAlerts: error while parsing URL',
      expect.objectContaining({
        error: expect.any(Object),
        origin: ORIGIN_MOCK,
        metaUrl: META_URL_MOCK,
      }),
    );

    expect(result.current).toEqual([ALERT_MOCK]);

    consoleWarnSpy.mockRestore();
  });
});

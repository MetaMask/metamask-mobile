import {
  PreferencesController,
  PreferencesState,
} from '@metamask/preferences-controller';
import {
  SignatureController,
  type SignatureControllerMessenger,
} from '@metamask/signature-controller';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import AppConstants from '../../../AppConstants';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import { SignatureControllerInit } from './signature-controller-init';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/signature-controller');
jest.mock('../../../../util/trace');

/**
 * Build a mock PreferencesController.
 *
 * @param partialMock - A partial mock object for the PreferencesController, merged
 * with the default mock.
 * @returns A mock PreferencesController.
 */
function buildControllerMock(
  partialMock?: Partial<PreferencesController>,
): PreferencesController {
  const defaultControllerMocks = {
    state: {
      useTransactionSimulations: true,
    },
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  return {
    ...defaultControllerMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<MessengerClientInitRequest<SignatureControllerMessenger>> {
  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseControllerMessenger),
    controllerMessenger:
      baseControllerMessenger as unknown as SignatureControllerMessenger,
    persistedState: {
      SignatureController: {},
    },
    ...initRequestProperties,
  };

  if (!initRequestProperties.getMessengerClient) {
    requestMock.getMessengerClient = jest
      .fn()
      .mockReturnValue(buildControllerMock());
  }

  return requestMock;
}

describe('SignatureController Init', () => {
  const signatureControllerClassMock = jest.mocked(SignatureController);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(SignatureControllerInit(requestMock).messengerClient).toBeInstanceOf(
      SignatureController,
    );
  });

  it('throws error if requested controller is not found', () => {
    const requestMock = buildInitRequestMock({
      getMessengerClient: () => {
        throw new Error('Controller not found');
      },
    });
    expect(() => SignatureControllerInit(requestMock)).toThrow(
      'Controller not found',
    );
  });

  it('throws error if controller initialization fails', () => {
    signatureControllerClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    expect(() => SignatureControllerInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('SignatureController constructor options', () => {
    it('correctly sets up isDecodeSignatureRequestEnabled option', () => {
      const requestMock = buildInitRequestMock({
        getMessengerClient: () =>
          buildControllerMock({
            state: { useTransactionSimulations: true } as PreferencesState,
          }),
      });

      SignatureControllerInit(requestMock);

      const isDecodeSignatureRequestEnabledFn = signatureControllerClassMock
        .mock.calls[0][0].isDecodeSignatureRequestEnabled as () => boolean;
      expect(isDecodeSignatureRequestEnabledFn()).toBe(true);
    });

    it('uses correct decoding API URL', () => {
      const requestMock = buildInitRequestMock();

      SignatureControllerInit(requestMock);

      const constructorOptions = signatureControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.decodingApiUrl).toBe(
        AppConstants.DECODING_API_URL,
      );
    });

    it('passes persisted state to controller', () => {
      const mockState = { someState: 'test' };
      const requestMock = buildInitRequestMock({
        persistedState: {
          SignatureController: mockState,
        },
      });

      SignatureControllerInit(requestMock);

      const constructorOptions = signatureControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.state).toBe(mockState);
    });
  });
});

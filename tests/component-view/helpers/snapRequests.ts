import Engine from '../../../app/core/Engine';

type SnapRequestMethod = 'onAmountInput' | 'confirmSend';

interface SetupSnapControllerHandleRequestMockOptions {
  onAmountInputResponse?: unknown;
  confirmSendResponse?: unknown;
}

let snapHandleRequestSpy: jest.SpyInstance | undefined;

/**
 * Intercepts SnapController handleRequest calls for component-view tests while
 * delegating all non-snap actions to the original controller messenger.
 */
export function setupSnapControllerHandleRequestMock(
  options: SetupSnapControllerHandleRequestMockOptions = {},
) {
  const {
    onAmountInputResponse = { valid: true, errors: [] },
    confirmSendResponse = { valid: true },
  } = options;

  const originalCall = Engine.controllerMessenger.call.bind(
    Engine.controllerMessenger,
  );

  clearSnapControllerHandleRequestMock();

  snapHandleRequestSpy = jest
    .spyOn(Engine.controllerMessenger, 'call')
    .mockImplementation((...messengerArgs) => {
      const [action, ...args] = messengerArgs as [string, ...unknown[]];
      if (action !== 'SnapController:handleRequest') {
        const passthroughArgs = messengerArgs as Parameters<
          typeof Engine.controllerMessenger.call
        >;
        return Reflect.apply(
          originalCall,
          Engine.controllerMessenger,
          passthroughArgs,
        ) as ReturnType<typeof Engine.controllerMessenger.call>;
      }

      const params = args[0] as
        | { request?: { method?: SnapRequestMethod } }
        | undefined;
      const requestMethod = params?.request?.method;

      if (requestMethod === 'onAmountInput') {
        return Promise.resolve(onAmountInputResponse) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      if (requestMethod === 'confirmSend') {
        return Promise.resolve(confirmSendResponse) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      return Promise.resolve(undefined) as ReturnType<
        typeof Engine.controllerMessenger.call
      >;
    });

  return snapHandleRequestSpy;
}

export function clearSnapControllerHandleRequestMock() {
  if (snapHandleRequestSpy) {
    snapHandleRequestSpy.mockRestore();
    snapHandleRequestSpy = undefined;
  }
}

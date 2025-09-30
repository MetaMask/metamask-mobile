import React from 'react';
import { render } from '@testing-library/react-native';

describe('PerpsStreamProvider - selection without E2E', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses the real PerpsStreamManager when isE2E is false', () => {
    // Given isE2E is false and no E2E mock is available
    jest.doMock('../../../../util/test/utils', () => ({
      isE2E: false,
    }));
    jest.doMock('../utils/e2eBridgePerps', () => ({
      getE2EMockStreamManager: () => null,
    }));

    // Spy on DevLogger to capture selection flags
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const DevLoggerModule = require('../../../../core/SDKConnect/utils/DevLogger');
    const devLoggerSpy = jest.spyOn(DevLoggerModule.DevLogger, 'log');

    // Import after mocks are set
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { PerpsStreamProvider } = require('./PerpsStreamManager');

    render(
      <PerpsStreamProvider>
        <></>
      </PerpsStreamProvider>,
    );

    // Then provider should select the real manager
    const call = devLoggerSpy.mock.calls.find((args: unknown[]) =>
      String(args[0]).includes('PerpsStreamProvider: Using stream manager:'),
    );
    expect(call).toBeTruthy();
    expect((call?.[1] as { isRealManager?: boolean })?.isRealManager).toBe(
      true,
    );
  });

  it('uses the E2E mock manager when isE2E is true and mock exists', () => {
    // Given isE2E is true and bridge returns a mock manager
    jest.doMock('../../../../util/test/utils', () => ({
      isE2E: true,
    }));

    const mockManager = { __mock: 'perps-stream-manager' };
    jest.doMock('../utils/e2eBridgePerps', () => ({
      getE2EMockStreamManager: () => mockManager,
    }));

    // Spy on DevLogger to capture selection flags
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const DevLoggerModule = require('../../../../core/SDKConnect/utils/DevLogger');
    const devLoggerSpy = jest.spyOn(DevLoggerModule.DevLogger, 'log');

    // Import after mocks are set
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { PerpsStreamProvider } = require('./PerpsStreamManager');

    render(
      <PerpsStreamProvider>
        <></>
      </PerpsStreamProvider>,
    );

    // Then provider should select the E2E mock manager
    const call = devLoggerSpy.mock.calls.find((args: unknown[]) =>
      String(args[0]).includes('PerpsStreamProvider: Using stream manager:'),
    );
    expect(call).toBeTruthy();
    expect(
      (call?.[1] as { isE2EMockManager?: boolean })?.isE2EMockManager,
    ).toBe(true);
  });
});

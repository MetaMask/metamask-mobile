/**
 * @jest-environment node
 */

import { getDriver } from './AppiumUtilities.ts';
import {
  runRecoveringFromLavaMoatScuttling,
  tapWebIdFallingBackToDomClick,
} from './IosWebViewTap.ts';

jest.mock('./AppiumUtilities.ts', () => ({
  getDriver: jest.fn(),
}));

const LAVAMOAT_CLICK_ERROR = new Error(
  'WebDriverError: Remote debugger error: Error: LavaMoat - property "self" of globalThis is inaccessible under scuttling mode. when running "element/click" with method "POST"',
);

const LAVAMOAT_FIND_ERROR = new Error(
  'unknown error: WebDriverError: Remote debugger error with code \'undefined\': Error: LavaMoat - property "navigator" of globalThis is inaccessible under scuttling mode. when running "element" with method "POST"',
);

describe('tapWebIdFallingBackToDomClick', () => {
  const execute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    execute.mockResolvedValue(true);
    jest.mocked(getDriver).mockReturnValue({
      execute,
    } as unknown as ReturnType<typeof getDriver>);
  });

  it('clicks the HTML id when Appium element click hits LavaMoat scuttling', async () => {
    const tap = jest.fn().mockRejectedValue(LAVAMOAT_CLICK_ERROR);

    await tapWebIdFallingBackToDomClick('signTypedDataV3', tap);

    expect(tap).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toContain('signTypedDataV3');
    expect(execute.mock.calls[0]?.[0]).toContain('.click()');
  });

  it('leaves a successful Appium click unchanged', async () => {
    const tap = jest.fn().mockResolvedValue(undefined);

    await tapWebIdFallingBackToDomClick('personalSign', tap);

    expect(tap).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rethrows click errors that are not LavaMoat scuttling', async () => {
    const tap = jest
      .fn()
      .mockRejectedValue(new Error('element not interactable'));

    await expect(tapWebIdFallingBackToDomClick('ethSign', tap)).rejects.toThrow(
      'element not interactable',
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('throws when the DOM click cannot find the HTML id', async () => {
    execute.mockResolvedValue(false);
    const tap = jest.fn().mockRejectedValue(LAVAMOAT_CLICK_ERROR);

    await expect(
      tapWebIdFallingBackToDomClick('missingButton', tap),
    ).rejects.toThrow('WebView element #missingButton not found for DOM click');
  });
});

describe('runRecoveringFromLavaMoatScuttling', () => {
  const execute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    execute.mockResolvedValue(true);
    jest.mocked(getDriver).mockReturnValue({
      execute,
    } as unknown as ReturnType<typeof getDriver>);
  });

  it('clicks via DOM when Appium element find hits LavaMoat navigator scuttling', async () => {
    const action = jest.fn().mockRejectedValue(LAVAMOAT_FIND_ERROR);

    await runRecoveringFromLavaMoatScuttling(
      'download_button',
      action,
      'find/tap',
    );

    expect(action).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toContain('download_button');
  });
});

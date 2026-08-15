import { BridgeViewSelectorsIDs } from '../../../../app/components/UI/Bridge/Views/BridgeView/BridgeView.testIds';
import {
  appendAppStateRestorationFailure,
  buildMmSessionProbeArgs,
  containsTestId,
  extractInteractionText,
  formatMmSessionSetupCommand,
  parseMetroPort,
  stopDiagnosticsThenRestoreAppState,
} from './runner-support';

describe('Swaps performance runner support', () => {
  it('extracts text for the requested test ID', () => {
    const output = {
      observation: {
        testIds: [
          { testId: BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT, text: '0' },
          { testId: BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA, text: 'ETH' },
        ],
      },
    };

    const result = extractInteractionText(
      output,
      BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA,
    );

    expect(result).toBe('ETH');
  });

  it.each([
    [{ observation: { testIds: [{ testId: 'login-password-input' }] } }, true],
    ['identifier: login-password-input', true],
    [{ observation: { testIds: [{ testId: 'wallet-screen' }] } }, false],
  ])('detects whether screen output contains a test ID', (output, expected) => {
    expect(containsTestId(output, 'login-password-input')).toBe(expected);
  });

  it.each([
    [[], 8081],
    [['--metro-port', '8082'], 8082],
  ])('parses Metro arguments from %j', (argv, expected) => {
    const result = parseMetroPort(argv);

    expect(result).toBe(expected);
  });

  it('rejects a Metro port outside the valid range', () => {
    expect(() => parseMetroPort(['--metro-port', '70000'])).toThrow(
      '--metro-port must be an integer between 1 and 65535',
    );
  });

  it('probes an existing session without launching the app', () => {
    const args = buildMmSessionProbeArgs();

    expect(args).toEqual(['describe-screen']);
    expect(args).not.toContain('launch');
  });

  it('formats the manual session setup command', () => {
    const command = formatMmSessionSetupCommand(8082);

    expect(command).toBe('yarn mm launch --metro-port 8082');
  });

  it('stops diagnostics before restoring app state', async () => {
    const calls: string[] = [];

    const result = await stopDiagnosticsThenRestoreAppState(
      () => {
        calls.push('stop-diagnostics');
        return { renders: 3 };
      },
      async () => {
        calls.push('restore-app-state');
      },
    );

    expect(calls).toEqual(['stop-diagnostics', 'restore-app-state']);
    expect(result).toEqual({
      capture: { renders: 3 },
      restorationError: null,
    });
  });

  it('preserves the capture when app-state restoration fails', async () => {
    const restorationError = new Error('back navigation failed');

    const result = await stopDiagnosticsThenRestoreAppState(
      () => ({ renders: 3 }),
      async () => {
        throw restorationError;
      },
    );

    expect(result).toEqual({
      capture: { renders: 3 },
      restorationError,
    });
  });

  it('turns a restoration error into a scenario failure', () => {
    expect(
      appendAppStateRestorationFailure(null, 'back navigation failed'),
    ).toBe(
      'App-state restoration failed: back navigation failed The next run may not start from clean Swaps state.',
    );
    expect(
      appendAppStateRestorationFailure(
        'Quote timed out.',
        'back navigation failed',
      ),
    ).toContain('Quote timed out. App-state restoration failed');
  });
});

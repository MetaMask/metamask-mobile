import {
  buildMmSessionProbeArgs,
  extractInteractionText,
  formatMmSessionSetupCommand,
  parseMetroPort,
} from './runner-support';

describe('Swaps performance runner support', () => {
  it('extracts text for the requested test ID', () => {
    const output = {
      observation: {
        testIds: [
          { testId: 'source-token-area-input', text: '0' },
          { testId: 'source-token-selector-button', text: 'ETH' },
        ],
      },
    };

    const result = extractInteractionText(
      output,
      'source-token-selector-button',
    );

    expect(result).toBe('ETH');
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
});

import {
  buildMmSessionProbeArgs,
  formatMmSessionSetupCommand,
} from './runner-config';

describe('Swaps performance runner configuration', () => {
  it('probes an existing session without launching the app', () => {
    const args = buildMmSessionProbeArgs();

    expect(args).toEqual(['describe-screen']);
    expect(args).not.toContain('launch');
  });

  it('formats the required Metro session setup command', () => {
    const command = formatMmSessionSetupCommand(8082);

    expect(command).toBe('yarn mm launch --metro-port 8082');
  });
});

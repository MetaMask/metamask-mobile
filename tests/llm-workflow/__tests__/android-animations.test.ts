import {
  disableAndroidAnimations,
  restoreAndroidAnimations,
} from '../android/animations';

const SERIAL = 'emulator-5554';
const SETTINGS = [
  'window_animation_scale',
  'transition_animation_scale',
  'animator_duration_scale',
] as const;

function createRunDeviceAdb(getValues: Record<string, string>) {
  const calls: string[][] = [];
  const run = jest.fn((serial: string, args: string[]): string => {
    calls.push([serial, ...args]);
    if (args[0] === 'shell' && args[2] === 'get') {
      return getValues[args[4]] ?? 'null';
    }
    return '';
  });
  return { run, calls };
}

describe('disableAndroidAnimations', () => {
  it('records prior non-zero values and sets each scale to 0', () => {
    const { run } = createRunDeviceAdb({
      window_animation_scale: '1',
      transition_animation_scale: '0.5',
      animator_duration_scale: 'null',
    });

    const state = disableAndroidAnimations(SERIAL, run);

    for (const setting of SETTINGS) {
      expect(run).toHaveBeenCalledWith(SERIAL, [
        'shell',
        'settings',
        'put',
        'global',
        setting,
        '0',
      ]);
    }
    expect(state.previous.get('window_animation_scale')).toBe('1');
    expect(state.previous.get('transition_animation_scale')).toBe('0.5');
    expect(state.previous.get('animator_duration_scale')).toBe('null');
  });

  it('skips settings that are already zero', () => {
    const { run } = createRunDeviceAdb({
      window_animation_scale: '0',
      transition_animation_scale: '0',
      animator_duration_scale: '0',
    });

    const state = disableAndroidAnimations(SERIAL, run);

    expect(state.previous.size).toBe(0);
    expect(run).not.toHaveBeenCalledWith(SERIAL, [
      'shell',
      'settings',
      'put',
      'global',
      'window_animation_scale',
      '0',
    ]);
  });

  it('restores earlier settings when disabling a later setting fails', () => {
    const run = jest.fn((serial: string, args: string[]): string => {
      const setting = args[4];
      if (args[2] === 'get') {
        if (setting === 'window_animation_scale') return '1';
        throw new Error('settings unavailable');
      }
      return '';
    });

    expect(() => disableAndroidAnimations(SERIAL, run)).toThrow(
      'settings unavailable',
    );
    expect(run).toHaveBeenCalledWith(SERIAL, [
      'shell',
      'settings',
      'put',
      'global',
      'window_animation_scale',
      '1',
    ]);
  });
});

describe('restoreAndroidAnimations', () => {
  it('restores recorded values and deletes settings that were unset', () => {
    const { run } = createRunDeviceAdb({});

    restoreAndroidAnimations(
      {
        serial: SERIAL,
        previous: new Map([
          ['window_animation_scale', '1'],
          ['animator_duration_scale', 'null'],
        ]),
      },
      run,
    );

    expect(run).toHaveBeenCalledWith(SERIAL, [
      'shell',
      'settings',
      'put',
      'global',
      'window_animation_scale',
      '1',
    ]);
    expect(run).toHaveBeenCalledWith(SERIAL, [
      'shell',
      'settings',
      'delete',
      'global',
      'animator_duration_scale',
    ]);
  });

  it('does nothing when no settings were changed', () => {
    const { run } = createRunDeviceAdb({});

    restoreAndroidAnimations({ serial: SERIAL, previous: new Map() }, run);

    expect(run).not.toHaveBeenCalled();
  });
});

import { FlowRecorder } from '../flow-recorder';
import { FlowPlayer } from '../flow-player';
import { DeviceInfo } from '../types';
import { parse } from 'yaml';

describe('Integration: Navigator -> Recorder -> Player', () => {
  it('recorder produces YAML that round-trips correctly', () => {
    const device: DeviceInfo = {
      serial: 'test',
      model: 'Test',
      screen: [1080, 2400],
    };
    const recorder = new FlowRecorder('test-flow', 'test goal', device);

    recorder.addStep('screenshots/001.png', 'Home screen', {
      type: 'tap',
      target: 'Send',
      coords: [540, 890],
    });
    recorder.addStep('screenshots/002.png', 'Send screen', {
      type: 'type',
      target: 'Address',
      text: '0xabc',
    });
    recorder.addStep('screenshots/003.png', 'Confirm screen', {
      type: 'back',
    });

    const yamlStr = recorder.toYaml();
    const flow = parse(yamlStr);

    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[0].action.type).toBe('tap');
    expect(flow.steps[1].action.text).toBe('0xabc');
    expect(flow.steps[2].action.type).toBe('back');
    expect(flow.name).toBe('test-flow');
  });

  it('FlowPlayer scales coordinates correctly for different screen sizes', () => {
    const scaled = FlowPlayer.scaleCoords(
      [540, 1200],
      [1080, 2400],
      [1440, 3200],
    );
    expect(scaled).toEqual([720, 1600]);

    const same = FlowPlayer.scaleCoords(
      [540, 1200],
      [1080, 2400],
      [1080, 2400],
    );
    expect(same).toEqual([540, 1200]);
  });
});

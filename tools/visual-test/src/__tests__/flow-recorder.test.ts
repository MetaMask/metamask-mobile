import { FlowRecorder } from '../flow-recorder';
import { DeviceInfo, Action } from '../types';
import { parse } from 'yaml';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('FlowRecorder', () => {
  const device: DeviceInfo = {
    serial: '1A2B',
    model: 'Pixel 7',
    screen: [1080, 2400],
  };
  let recorder: FlowRecorder;

  beforeEach(() => {
    recorder = new FlowRecorder('Send ETH flow', 'Test send flow', device);
  });

  describe('addStep', () => {
    it('adds a step with incrementing id', () => {
      const action: Action = {
        type: 'tap',
        target: 'Send',
        coords: [540, 890],
      };
      recorder.addStep('screenshots/001.png', 'Home screen', action);
      recorder.addStep('screenshots/002.png', 'Send screen', { type: 'back' });

      const flow = recorder.getFlow();
      expect(flow.steps).toHaveLength(2);
      expect(flow.steps[0].id).toBe(1);
      expect(flow.steps[1].id).toBe(2);
    });

    it('includes note when provided', () => {
      const action: Action = {
        type: 'tap',
        target: 'Send',
        coords: [540, 890],
      };
      recorder.addStep(
        'screenshots/001.png',
        'Home screen',
        action,
        'Check this button',
      );

      const flow = recorder.getFlow();
      expect(flow.steps[0].note).toBe('Check this button');
    });
  });

  describe('getFlow', () => {
    it('returns flow with metadata', () => {
      const flow = recorder.getFlow();
      expect(flow.name).toBe('Send ETH flow');
      expect(flow.goal).toBe('Test send flow');
      expect(flow.device).toEqual(device);
      expect(flow.steps).toEqual([]);
    });
  });

  describe('toYaml', () => {
    it('serializes flow to valid YAML', () => {
      const action: Action = {
        type: 'tap',
        target: 'Send',
        coords: [540, 890],
      };
      recorder.addStep('screenshots/001.png', 'Home screen', action);

      const yamlStr = recorder.toYaml();
      const parsed = parse(yamlStr);
      expect(parsed.name).toBe('Send ETH flow');
      expect(parsed.steps[0].action.type).toBe('tap');
    });
  });
});

import { BaselineManager } from '../baseline-manager';
import { mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('BaselineManager', () => {
  let baseDir: string;
  let manager: BaselineManager;

  beforeEach(() => {
    baseDir = join(tmpdir(), `vt-test-${Date.now()}`);
    mkdirSync(baseDir, { recursive: true });
    manager = new BaselineManager(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  describe('saveStep', () => {
    it('saves screenshot and description', () => {
      manager.saveStep(
        'test-flow',
        1,
        Buffer.from('fake-png'),
        'Home screen description',
      );

      const dir = join(baseDir, 'test-flow');
      expect(existsSync(join(dir, '001.png'))).toBe(true);
      expect(readFileSync(join(dir, '001.desc.txt'), 'utf-8')).toBe(
        'Home screen description',
      );
    });
  });

  describe('loadStep', () => {
    it('returns null for nonexistent baseline', () => {
      const result = manager.loadStep('nonexistent', 1);
      expect(result).toBeNull();
    });

    it('returns screenshot buffer and description', () => {
      manager.saveStep('test-flow', 1, Buffer.from('fake-png'), 'Home screen');
      const result = manager.loadStep('test-flow', 1);
      expect(result).not.toBeNull();
      expect(result!.description).toBe('Home screen');
      expect(result!.screenshot.toString()).toBe('fake-png');
    });
  });

  describe('listBaselines', () => {
    it('lists saved baseline directories', () => {
      manager.saveStep('flow-a', 1, Buffer.from('a'), 'desc a');
      manager.saveStep('flow-b', 1, Buffer.from('b'), 'desc b');

      const list = manager.listBaselines();
      expect(list.sort()).toEqual(['flow-a', 'flow-b']);
    });
  });

  describe('deleteBaseline', () => {
    it('removes baseline directory', () => {
      manager.saveStep('test-flow', 1, Buffer.from('a'), 'desc');
      manager.deleteBaseline('test-flow');
      expect(existsSync(join(baseDir, 'test-flow'))).toBe(false);
    });
  });
});

import { findAnrDialogWaitTapPoint } from './EmulatorHelpers.ts';

describe('EmulatorHelpers', () => {
  describe('findAnrDialogWaitTapPoint', () => {
    it('returns Wait button center when Pixel Launcher ANR is visible', () => {
      const uiDump = `
        <node text="Pixel Launcher isn't responding" bounds="[100,500][980,700]" />
        <node text="Close app" bounds="[120,620][480,680]" clickable="true" />
        <node text="Wait" bounds="[600,620][960,680]" clickable="true" />
      `;

      expect(findAnrDialogWaitTapPoint(uiDump)).toEqual({ x: 780, y: 650 });
    });

    it('returns undefined when no ANR dialog is present', () => {
      const uiDump =
        '<node text="Settings" bounds="[0,0][100,100]" clickable="true" />';

      expect(findAnrDialogWaitTapPoint(uiDump)).toBeUndefined();
    });

    it('falls back to Close app when Wait is absent', () => {
      const uiDump = `
        <node text="Messages isn't responding" bounds="[100,500][980,700]" />
        <node text="Close app" bounds="[120,620][480,680]" clickable="true" />
      `;

      expect(findAnrDialogWaitTapPoint(uiDump)).toEqual({ x: 300, y: 650 });
    });
  });
});

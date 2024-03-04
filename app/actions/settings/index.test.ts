import { toggleBasicServices } from '.';

describe('settings, toggleBasicServices', () => {
  describe('toggleBasicServices actions', () => {
    it('should disable certain api calls when set to true', () => {
      expect(toggleBasicServices(true)).toEqual({
        type: 'TOGGLE_BASIC_SERVICES',
        basicServicesEnabled: true,
      });
    });

    it('should enable api calls when set to false', () => {
      expect(toggleBasicServices(false)).toEqual({
        type: 'TOGGLE_BASIC_SERVICES',
        basicServicesEnabled: false,
      });
    });
  });
});

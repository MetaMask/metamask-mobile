import { BASE_FLAGS_DATA } from './base-flags.ts';

describe('BASE_FLAGS_DATA', () => {
  it('includes Chase as a default-off version-gated flag', () => {
    const chaseFlag = BASE_FLAGS_DATA.find((flag) =>
      Object.prototype.hasOwnProperty.call(flag, 'perpsMobileChase'),
    );

    expect(chaseFlag).toEqual({
      perpsMobileChase: {
        minimumVersion: '8.10.0',
        enabled: false,
      },
    });
  });
});

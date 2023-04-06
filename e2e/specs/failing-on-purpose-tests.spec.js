'use strict';

describe('Failing Tests On Purpose', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should fail', () => {
    fail('This test is failing on purpose');
  });
});

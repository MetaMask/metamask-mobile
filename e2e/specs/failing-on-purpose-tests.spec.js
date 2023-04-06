'use strict';

describe('Failing Tests On Purpose', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should fail', async () => {
    await expect(element(by.id('non existing element id'))).toExist();
  });
});

'use strict';
import AccountListView from '../pages/AccountListView';

describe('Failing Tests On Purpose', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should fail', async () => {
    await AccountListView.isNewAccountNameVisible();
  });
});

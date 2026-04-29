import { showMoneyActivityUnderConstructionAlert } from './showMoneyActivityUnderConstructionAlert';

describe('showMoneyActivityUnderConstructionAlert', () => {
  const originalAlert = global.alert;

  beforeEach(() => {
    global.alert = jest.fn();
  });

  afterEach(() => {
    global.alert = originalAlert;
  });

  it('shows the under-construction alert', () => {
    showMoneyActivityUnderConstructionAlert();

    expect(global.alert).toHaveBeenCalledTimes(1);
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Under construction'),
    );
  });
});

// BEGIN: jk3n4l5m6o7p

import { dismissAlert, showAlert } from './index';

describe('Alert actions', () => {
  it('should create an action to dismiss an alert', () => {
    const expectedAction = {
      type: 'HIDE_ALERT',
    };
    expect(dismissAlert()).toEqual(expectedAction);
  });

  it('should create an action to show an alert', () => {
    const alertData = {
      isVisible: true,
      autodismiss: false,
      content: 'This is an alert message',
      data: { foo: 'bar' },
    };
    const expectedAction = {
      type: 'SHOW_ALERT',
      ...alertData,
    };
    expect(showAlert(alertData)).toEqual(expectedAction);
  });
});

// END: jk3n4l5m6o7p

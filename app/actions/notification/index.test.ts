import {
  hideNotificationById,
  modifyOrShowSimpleNotificationById,
  modifyOrShowTransactionNotificationById,
  removeCurrentNotification,
  removeNotVisibleNotifications,
  removeNotificationById,
  replaceNotificationById,
  showSimpleNotification,
  showTransactionNotification,
} from '.';

describe('Notification Actions', () => {
  describe('hideNotificationById', () => {
    it('should return an object with type HIDE_NOTIFICATION_BY_ID and the given id', () => {
      const id = 123;
      const expectedAction = {
        type: 'HIDE_NOTIFICATION_BY_ID',
        id,
      };
      expect(hideNotificationById(id)).toEqual(expectedAction);
    });
  });

  describe('modifyOrShowTransactionNotificationById', () => {
    it('should return an object with type MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION and the given autodismiss, transaction, and status', () => {
      const autodismiss = true;
      const transaction = { id: 456, amount: 100 };
      const status = 'pending';
      const expectedAction = {
        type: 'MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION',
        autodismiss,
        transaction,
        status,
      };
      expect(
        modifyOrShowTransactionNotificationById({
          autodismiss,
          transaction,
          status,
        }),
      ).toEqual(expectedAction);
    });
  });

  describe('modifyOrShowSimpleNotificationById', () => {
    it('should return an object with type MODIFY_OR_SHOW_SIMPLE_NOTIFICATION and the given autodismiss, title, description, and status', () => {
      const autodismiss = true;
      const title = 'Test Notification';
      const description = 'This is a test notification';
      const status = 'success';
      const expectedAction = {
        type: 'MODIFY_OR_SHOW_SIMPLE_NOTIFICATION',
        autodismiss,
        title,
        description,
        status,
      };
      expect(
        modifyOrShowSimpleNotificationById({
          autodismiss,
          title,
          description,
          status,
        }),
      ).toEqual(expectedAction);
    });
  });

  describe('replaceNotificationById', () => {
    it('should return an object with type REPLACE_NOTIFICATION_BY_ID and the given notification and id', () => {
      const notification = {
        id: 789,
        title: 'Test Notification',
        description: 'This is a test notification',
        status: 'success',
      };
      const expectedAction = {
        type: 'REPLACE_NOTIFICATION_BY_ID',
        notification,
        id: notification.id,
      };
      expect(replaceNotificationById(notification)).toEqual(expectedAction);
    });
  });

  describe('removeNotificationById', () => {
    it('should return an object with type REMOVE_NOTIFICATION_BY_ID and the given id', () => {
      const id = 123;
      const expectedAction = {
        type: 'REMOVE_NOTIFICATION_BY_ID',
        id,
      };
      expect(removeNotificationById(id)).toEqual(expectedAction);
    });
  });

  describe('removeCurrentNotification', () => {
    it('should return an object with type REMOVE_CURRENT_NOTIFICATION', () => {
      const expectedAction = {
        type: 'REMOVE_CURRENT_NOTIFICATION',
      };
      expect(removeCurrentNotification()).toEqual(expectedAction);
    });
  });

  describe('showSimpleNotification', () => {
    it('should return an object with type SHOW_SIMPLE_NOTIFICATION and the given autodismiss, title, description, status, and id', () => {
      const autodismiss = true;
      const title = 'Test Notification';
      const description = 'This is a test notification';
      const status = 'success';
      const id = 123;
      const expectedAction = {
        type: 'SHOW_SIMPLE_NOTIFICATION',
        autodismiss,
        title,
        description,
        status,
        id,
      };
      expect(
        showSimpleNotification({
          autodismiss,
          title,
          description,
          status,
          id,
        }),
      ).toEqual(expectedAction);
    });
  });

  describe('showTransactionNotification', () => {
    it('should return an object with type SHOW_TRANSACTION_NOTIFICATION and the given autodismiss, transaction, and status', () => {
      const autodismiss = true;
      const transaction = { id: 456, amount: 100 };
      const status = 'pending';
      const expectedAction = {
        type: 'SHOW_TRANSACTION_NOTIFICATION',
        autodismiss,
        transaction,
        status,
      };
      expect(
        showTransactionNotification({
          autodismiss,
          transaction,
          status,
        }),
      ).toEqual(expectedAction);
    });
  });

  describe('removeNotVisibleNotifications', () => {
    it('should return an object with type REMOVE_NOT_VISIBLE_NOTIFICATIONS', () => {
      const expectedAction = {
        type: 'REMOVE_NOT_VISIBLE_NOTIFICATIONS',
      };
      expect(removeNotVisibleNotifications()).toEqual(expectedAction);
    });
  });
});

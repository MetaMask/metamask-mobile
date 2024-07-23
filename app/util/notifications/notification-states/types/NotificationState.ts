import { Notification } from '../../types';
import { NotificationMenuItem } from './NotificationMenuItem';
import { NotificationModalDetails } from './NotificationModalDetails';

export interface NotificationState<T extends Notification = Notification> {
  guardFn: (n: Notification) => n is T;
  createMenuItem: (n: T) => NotificationMenuItem;
  createModalDetails?: (n: T) => NotificationModalDetails;
}

import { Notification } from '../../types';
import { NotificationMenuItem } from './NotificationMenuItem';
import { NotificationModalDetails } from './NotificationModalDetails';

export interface NotificationState<N extends Notification = Notification> {
  guardFn: (n: Notification) => n is N;
  createMenuItem: (n: N) => NotificationMenuItem;
  createModalDetails?: (n: N) => NotificationModalDetails;
}

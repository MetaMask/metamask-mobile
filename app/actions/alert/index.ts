import type { Action as ReduxAction } from 'redux';

export interface AlertData {
  msg: string;
  width?: string;
}

export interface ShowAlert extends ReduxAction<'SHOW_ALERT'> {
  autodismiss: number;
  content: string;
  data: AlertData;
}
export type HideAlert = ReduxAction<'HIDE_ALERT'>;
export type AlertAction = ShowAlert | HideAlert;

export function dismissAlert(): HideAlert {
  return {
    type: 'HIDE_ALERT',
  };
}

export function showAlert({
  isVisible,
  autodismiss,
  content,
  data,
}: {
  isVisible?: boolean;
  autodismiss: number;
  content: string;
  data: AlertData;
}): ShowAlert {
  return {
    type: 'SHOW_ALERT',
    isVisible,
    autodismiss,
    content,
    data,
  } as ShowAlert;
}

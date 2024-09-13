export function dismissAlert() {
  return {
    type: 'HIDE_ALERT',
  };
}

export function showAlert({ isVisible, autodismiss, content, data }: any) {
  return {
    type: 'SHOW_ALERT',
    isVisible,
    autodismiss,
    content,
    data,
  };
}

import React from 'react';

export interface ModalMandatoryI {
  headerTitle: string;
  onConfirm: () => void;
  footerHelpText?: string;
  confirmDisabled: boolean;
  buttonText: string;
  children: React.ReactNode;
}

import React from 'react';

export interface ModalMandatoryI {
  headerTitle: string;
  onPress: () => void;
  footerHelpText?: string;
  buttonDisabled?: boolean;
  buttonText: string;
  children: React.ReactNode;
}

import React from 'react';
import AddNewAccount from './AddNewAccount';

export interface AddNonEvmAccountProps {
  onBack: () => void;
  createAccount: (args) => void;
}

const AddNewNonEvmAccount = ({
  onBack,
  createAccount,
}: AddNonEvmAccountProps) => {
  return <AddNewAccount onBack={onBack} createAccount={createAccount} />;
};

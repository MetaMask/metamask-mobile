import React from 'react';
import MultichainAccountConnect from './MultichainAccountConnect';
import { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';

export const State2AccountConnectWrapper = (props: AccountConnectProps) => (
  <MultichainAccountConnect {...props} />
);

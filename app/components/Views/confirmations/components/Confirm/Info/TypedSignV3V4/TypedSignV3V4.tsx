import React from 'react';
import AccountNetworkInfo from '../../AccountNetworkInfo';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import Message from './Message';
import TypedSignV3V4Simulation from './Simulation';

const TypedSignV3V4 = () => (
    <>
      <AccountNetworkInfo />
      <TypedSignV3V4Simulation />
      <InfoRowOrigin />
      <Message />
    </>
  );

export default TypedSignV3V4;

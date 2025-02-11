import React from 'react';
import AccountNetworkInfo from '../../AccountNetworkInfo';
import { InfoSectionAddressAndOrigin } from './InfoSectionAddressAndOrigin';
import Message from './Message';
import TypedSignV3V4Simulation from './Simulation';

const TypedSignV3V4 = () => (
    <>
      <AccountNetworkInfo />
      <TypedSignV3V4Simulation />
      <InfoSectionAddressAndOrigin />
      <Message />
    </>
  );

export default TypedSignV3V4;

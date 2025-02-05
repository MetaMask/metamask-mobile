import React from 'react';
import { InfoSectionAddressAndOrigin } from './InfoSectionAddressAndOrigin';
import Message from './Message';
import TypedSignV3V4Simulation from './Simulation';

const TypedSignV3V4 = () => (
    <>
      <TypedSignV3V4Simulation />
      <InfoSectionAddressAndOrigin />
      <Message />
    </>
  );

export default TypedSignV3V4;

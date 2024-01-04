/* eslint-disable react/prop-types, react/jsx-pascal-case */

// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { CryptoLogoProps } from './CryptoLogo.types';
import { assetByCryptoLogoName } from './CryptoLogo.assets';
const CryptoLogo: React.FC<CryptoLogoProps> = ({ name, size }) => {
  const SVG = assetByCryptoLogoName[name] as React.ElementType;
  return (
    <SVG
      width={Number(size)}
      height={Number(size)}
      viewBox={'0 0 250 250'}
      name={name}
    />
  );
};

export default CryptoLogo;

import React from 'react';
import { useFontPreloader } from '../../../hooks/useFontPreloader';
import FoxLoader from '../../UI/FoxLoader';

interface FontLoadingGateProps {
  children: React.ReactNode;
}

const FontLoadingGate: React.FC<FontLoadingGateProps> = ({ children }) => {
  const fontsLoaded = useFontPreloader();

  if (!fontsLoaded) {
    return <FoxLoader />; // Now has theme context!
  }

  return <>{children}</>;
};

export default FontLoadingGate;

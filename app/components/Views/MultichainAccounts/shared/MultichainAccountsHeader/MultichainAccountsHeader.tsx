import React from 'react';
import { useSelector } from 'react-redux';

import HeaderStandardGlass, {
  type HeaderStandardGlassProps,
} from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export type MultichainAccountsHeaderProps = Omit<
  HeaderStandardGlassProps,
  'isGlass' | 'isFloating'
>;

/** In-flow stack header with glass buttons behind `glassHeaders`. */
const MultichainAccountsHeader = (props: MultichainAccountsHeaderProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;

  return (
    <HeaderStandardGlass
      {...props}
      isGlass={isGlassHeader}
      isFloating={false}
    />
  );
};

export default MultichainAccountsHeader;

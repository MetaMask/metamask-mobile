import React from 'react';
import PoweredByTransakSVG from '../../assets/powered-by-transak.svg';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './PoweredByTransak.styles';

function PoweredByTransak({
  name,
  ...props
}: React.ComponentProps<typeof PoweredByTransakSVG>) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <PoweredByTransakSVG
      fill="currentColor"
      style={styles.logo}
      name="powered-by-transak-logo"
      {...props}
    />
  );
}

export default PoweredByTransak;

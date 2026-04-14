import React from 'react';
import PoweredByTransakSVG from '../../assets/powered-by-transak.svg';
import I18n, { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './PoweredByTransak.styles';

function PoweredByTransak({
  name,
  ...props
}: React.ComponentProps<typeof PoweredByTransakSVG>) {
  const { styles } = useStyles(styleSheet, {});
  const locale = typeof I18n.locale === 'string' ? I18n.locale : 'en';
  const showLocalizedText = locale.toLowerCase().startsWith('en') === false;

  if (showLocalizedText) {
    return (
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        style={styles.text}
      >
        {strings('fiat_on_ramp.powered_by_provider', {
          provider: 'Transak',
        })}
      </Text>
    );
  }

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

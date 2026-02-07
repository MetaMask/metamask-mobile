import React, { useMemo } from 'react';
import {
  Platform,
  TouchableOpacity,
  type GestureResponderEvent,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import I18n from 'react-native-i18n';

type SvgComponent = React.FC<SvgProps & { name: string }>;

import GoogleWalletButtonAf from './assets/google-wallet-button-af.svg';
import GoogleWalletButtonAm from './assets/google-wallet-button-am.svg';
import GoogleWalletButtonAr from './assets/google-wallet-button-ar.svg';
import GoogleWalletButtonAz from './assets/google-wallet-button-az.svg';
import GoogleWalletButtonBg from './assets/google-wallet-button-bg.svg';
import GoogleWalletButtonBn from './assets/google-wallet-button-bn.svg';
import GoogleWalletButtonBr from './assets/google-wallet-button-br.svg';
import GoogleWalletButtonBs from './assets/google-wallet-button-bs.svg';
import GoogleWalletButtonBy from './assets/google-wallet-button-by.svg';
import GoogleWalletButtonCa from './assets/google-wallet-button-ca.svg';
import GoogleWalletButtonCz from './assets/google-wallet-button-cz.svg';
import GoogleWalletButtonDe from './assets/google-wallet-button-de.svg';
import GoogleWalletButtonDk from './assets/google-wallet-button-dk.svg';
import GoogleWalletButtonEnAU from './assets/google-wallet-button-enAU.svg';
import GoogleWalletButtonEnCA from './assets/google-wallet-button-enCA.svg';
import GoogleWalletButtonEnGB from './assets/google-wallet-button-enGB.svg';
import GoogleWalletButtonEnIN from './assets/google-wallet-button-enIN.svg';
import GoogleWalletButtonEnSG from './assets/google-wallet-button-enSG.svg';
import GoogleWalletButtonEnUS from './assets/google-wallet-button-enUS.svg';
import GoogleWalletButtonEnZA from './assets/google-wallet-button-enZA.svg';
import GoogleWalletButtonEs419 from './assets/google-wallet-button-es419.svg';
import GoogleWalletButtonEsES from './assets/google-wallet-button-esES.svg';
import GoogleWalletButtonEsUS from './assets/google-wallet-button-esUS.svg';
import GoogleWalletButtonEt from './assets/google-wallet-button-et.svg';
import GoogleWalletButtonFa from './assets/google-wallet-button-fa.svg';
import GoogleWalletButtonFl from './assets/google-wallet-button-fl.svg';
import GoogleWalletButtonFp from './assets/google-wallet-button-fp.svg';
import GoogleWalletButtonFrCA from './assets/google-wallet-button-frCA.svg';
import GoogleWalletButtonFrFR from './assets/google-wallet-button-frFR.svg';
import GoogleWalletButtonGr from './assets/google-wallet-button-gr.svg';
import GoogleWalletButtonHe from './assets/google-wallet-button-he.svg';
import GoogleWalletButtonHr from './assets/google-wallet-button-hr.svg';
import GoogleWalletButtonHu from './assets/google-wallet-button-hu.svg';
import GoogleWalletButtonHy from './assets/google-wallet-button-hy.svg';
import GoogleWalletButtonId from './assets/google-wallet-button-id.svg';
import GoogleWalletButtonIs from './assets/google-wallet-button-is.svg';
import GoogleWalletButtonIt from './assets/google-wallet-button-it.svg';
import GoogleWalletButtonJp from './assets/google-wallet-button-jp.svg';
import GoogleWalletButtonKa from './assets/google-wallet-button-ka.svg';
import GoogleWalletButtonKh from './assets/google-wallet-button-kh.svg';
import GoogleWalletButtonKk from './assets/google-wallet-button-kk.svg';
import GoogleWalletButtonKy from './assets/google-wallet-button-ky.svg';
import GoogleWalletButtonLo from './assets/google-wallet-button-lo.svg';
import GoogleWalletButtonLt from './assets/google-wallet-button-lt.svg';
import GoogleWalletButtonLv from './assets/google-wallet-button-lv.svg';
import GoogleWalletButtonMk from './assets/google-wallet-button-mk.svg';
import GoogleWalletButtonMn from './assets/google-wallet-button-mn.svg';
import GoogleWalletButtonMy from './assets/google-wallet-button-my.svg';
import GoogleWalletButtonNe from './assets/google-wallet-button-ne.svg';
import GoogleWalletButtonNl from './assets/google-wallet-button-nl.svg';
import GoogleWalletButtonNo from './assets/google-wallet-button-no.svg';
import GoogleWalletButtonPl from './assets/google-wallet-button-pl.svg';
import GoogleWalletButtonPt from './assets/google-wallet-button-pt.svg';
import GoogleWalletButtonRo from './assets/google-wallet-button-ro.svg';
import GoogleWalletButtonRu from './assets/google-wallet-button-ru.svg';
import GoogleWalletButtonSe from './assets/google-wallet-button-se.svg';
import GoogleWalletButtonSi from './assets/google-wallet-button-si.svg';
import GoogleWalletButtonSk from './assets/google-wallet-button-sk.svg';
import GoogleWalletButtonSl from './assets/google-wallet-button-sl.svg';
import GoogleWalletButtonSq from './assets/google-wallet-button-sq.svg';
import GoogleWalletButtonSr from './assets/google-wallet-button-sr.svg';
import GoogleWalletButtonSw from './assets/google-wallet-button-sw.svg';
import GoogleWalletButtonTh from './assets/google-wallet-button-th.svg';
import GoogleWalletButtonTr from './assets/google-wallet-button-tr.svg';
import GoogleWalletButtonUk from './assets/google-wallet-button-uk.svg';
import GoogleWalletButtonUr from './assets/google-wallet-button-ur.svg';
import GoogleWalletButtonUz from './assets/google-wallet-button-uz.svg';
import GoogleWalletButtonVi from './assets/google-wallet-button-vi.svg';
import GoogleWalletButtonZhHK from './assets/google-wallet-button-zhHK.svg';
import GoogleWalletButtonZhTW from './assets/google-wallet-button-zhTW.svg';

export const GOOGLE_WALLET_BUTTON_BY_REGION: Record<string, SvgComponent> = {
  en_au: GoogleWalletButtonEnAU,
  en_ca: GoogleWalletButtonEnCA,
  en_gb: GoogleWalletButtonEnGB,
  en_in: GoogleWalletButtonEnIN,
  en_sg: GoogleWalletButtonEnSG,
  en_us: GoogleWalletButtonEnUS,
  en_za: GoogleWalletButtonEnZA,
  es_419: GoogleWalletButtonEs419,
  es_es: GoogleWalletButtonEsES,
  es_us: GoogleWalletButtonEsUS,
  fr_ca: GoogleWalletButtonFrCA,
  fr_fr: GoogleWalletButtonFrFR,
  zh_hk: GoogleWalletButtonZhHK,
  zh_tw: GoogleWalletButtonZhTW,
};

export const GOOGLE_WALLET_BUTTON_BY_LANGUAGE: Record<string, SvgComponent> = {
  af: GoogleWalletButtonAf,
  am: GoogleWalletButtonAm,
  ar: GoogleWalletButtonAr,
  az: GoogleWalletButtonAz,
  be: GoogleWalletButtonBy,
  bg: GoogleWalletButtonBg,
  bn: GoogleWalletButtonBn,
  br: GoogleWalletButtonBr,
  bs: GoogleWalletButtonBs,
  by: GoogleWalletButtonBy,
  ca: GoogleWalletButtonCa,
  cs: GoogleWalletButtonCz,
  cz: GoogleWalletButtonCz,
  da: GoogleWalletButtonDk,
  de: GoogleWalletButtonDe,
  dk: GoogleWalletButtonDk,
  el: GoogleWalletButtonGr,
  en: GoogleWalletButtonEnUS,
  es: GoogleWalletButtonEs419,
  et: GoogleWalletButtonEt,
  fa: GoogleWalletButtonFa,
  fl: GoogleWalletButtonFl,
  fp: GoogleWalletButtonFp,
  fr: GoogleWalletButtonFrFR,
  gr: GoogleWalletButtonGr,
  he: GoogleWalletButtonHe,
  hi: GoogleWalletButtonEnUS,
  hr: GoogleWalletButtonHr,
  hu: GoogleWalletButtonHu,
  hy: GoogleWalletButtonHy,
  id: GoogleWalletButtonId,
  is: GoogleWalletButtonIs,
  it: GoogleWalletButtonIt,
  ja: GoogleWalletButtonJp,
  jp: GoogleWalletButtonJp,
  ka: GoogleWalletButtonKa,
  kh: GoogleWalletButtonKh,
  kk: GoogleWalletButtonKk,
  km: GoogleWalletButtonKh,
  ko: GoogleWalletButtonEnUS,
  ky: GoogleWalletButtonKy,
  lo: GoogleWalletButtonLo,
  lt: GoogleWalletButtonLt,
  lv: GoogleWalletButtonLv,
  mk: GoogleWalletButtonMk,
  mn: GoogleWalletButtonMn,
  my: GoogleWalletButtonMy,
  ne: GoogleWalletButtonNe,
  nl: GoogleWalletButtonNl,
  no: GoogleWalletButtonNo,
  pl: GoogleWalletButtonPl,
  pt: GoogleWalletButtonPt,
  ro: GoogleWalletButtonRo,
  ru: GoogleWalletButtonRu,
  se: GoogleWalletButtonSe,
  si: GoogleWalletButtonSi,
  sk: GoogleWalletButtonSk,
  sl: GoogleWalletButtonSl,
  sq: GoogleWalletButtonSq,
  sr: GoogleWalletButtonSr,
  sv: GoogleWalletButtonSe,
  sw: GoogleWalletButtonSw,
  th: GoogleWalletButtonTh,
  tl: GoogleWalletButtonFl,
  tr: GoogleWalletButtonTr,
  uk: GoogleWalletButtonUk,
  ur: GoogleWalletButtonUr,
  uz: GoogleWalletButtonUz,
  vi: GoogleWalletButtonVi,
  zh: GoogleWalletButtonZhTW,
};

const ANDROID_BUTTON_WIDTH = 300;
const ANDROID_BUTTON_HEIGHT = 48;

interface AddToWalletButtonProps {
  onPress?: (e: GestureResponderEvent) => void;
  buttonStyle?: 'black' | 'blackOutline';
  buttonType?: 'basic' | 'badge';
  borderRadius?: number;
  testID?: string;
}

export function getGoogleWalletButtonSvg(
  localeOverride?: string,
): SvgComponent {
  const locale: string = localeOverride ?? I18n.locale ?? 'en';
  const normalized = locale.replace('-', '_').toLowerCase();

  const regionMatch = GOOGLE_WALLET_BUTTON_BY_REGION[normalized];
  if (regionMatch) {
    return regionMatch;
  }

  const baseLanguage = normalized.split('_')[0];
  const languageMatch = GOOGLE_WALLET_BUTTON_BY_LANGUAGE[baseLanguage];
  if (languageMatch) {
    return languageMatch;
  }

  return GoogleWalletButtonEnUS;
}

const AddToWalletButton: React.FC<AddToWalletButtonProps> = ({
  onPress,
  buttonStyle = 'blackOutline',
  buttonType = 'basic',
  borderRadius = 4,
  testID,
}) => {
  const GoogleWalletSvg = useMemo(() => getGoogleWalletButtonSvg(), []);

  if (Platform.OS === 'ios') {
    const {
      AddToWalletButton: NativeAddToWalletButton,
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    } = require('@expensify/react-native-wallet');
    return (
      <NativeAddToWalletButton
        onPress={onPress}
        buttonStyle={buttonStyle}
        buttonType={buttonType}
        borderRadius={borderRadius}
      />
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Add to Google Wallet"
    >
      <GoogleWalletSvg
        name="google-wallet-button"
        width={ANDROID_BUTTON_WIDTH}
        height={ANDROID_BUTTON_HEIGHT}
      />
    </TouchableOpacity>
  );
};

export default AddToWalletButton;

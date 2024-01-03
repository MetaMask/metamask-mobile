// Internal dependencies.
import { default as CryptoLogoComponent } from './CryptoLogo';
import { CryptoLogoName } from './CryptoLogo.types';

const CryptoLogoMeta = {
  title: 'Component Library / CryptoLogos',
  component: CryptoLogoComponent,
  argTypes: {
    name: {
      options: CryptoLogoName,
      control: {
        type: 'select',
      },
    },
    size: {
      control: {
        type: 'number',
      },
    },
  },
};
export default CryptoLogoMeta;

export const CryptoLogo = {
  args: {
    name: CryptoLogoName.BOA,
    size: 50,
  },
};

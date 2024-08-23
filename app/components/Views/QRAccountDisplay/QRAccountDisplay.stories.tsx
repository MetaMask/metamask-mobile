import { default as QRAccountDisplayComponent } from './';

const SAMPLE_QRACCOUNTDISPLAY_PROPS = {
  accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
};

const QRAccountDisplayMeta = {
  title: 'Component Library / Account',
  component: QRAccountDisplayComponent,
  argTypes: {
    accountAddress: {
      control: { type: 'text' },
      defaultValue: SAMPLE_QRACCOUNTDISPLAY_PROPS.accountAddress,
    },
  },
};
export default QRAccountDisplayMeta;

export const QRAccountDisplay = {
  args: {
    accountAddress: SAMPLE_QRACCOUNTDISPLAY_PROPS.accountAddress,
  },
};

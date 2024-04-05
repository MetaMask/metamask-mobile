/* eslint-disable no-console */
// Internal dependencies.
import {
  MandatoryModalParams,
  MandatoryModalProps,
} from './ModalMandatory.types';

export const WEBVIEW_SCROLL_END_EVENT = 'end';
export const WEBVIEW_SCROLL_NOT_END_EVENT = '!end';

// Sample consts
const SAMPLE_MODALMANDATORY_PARAMS_PROPS: MandatoryModalParams = {
  params: {
    body: {
      source: 'WebView',
      uri: 'https://consensys.net/terms-of-use/',
    },
    headerTitle: 'Sample ModalMandatory headerTitle',
    onAccept: () => {
      console.log('ModalMandatory Accepted');
    },
    footerHelpText: 'Sample ModalMandatory footerHelpText',
    buttonText: 'ModalMandatory buttonText',
    checkboxText: 'ModalMandatory checkboxText',
    onRender: () => {
      console.log('ModalMandatory rendered');
    },
  },
};
export const SAMPLE_MODALMANDATORY_PROPS: MandatoryModalProps = {
  route: SAMPLE_MODALMANDATORY_PARAMS_PROPS,
};

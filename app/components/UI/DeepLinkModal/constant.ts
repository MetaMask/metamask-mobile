import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { ImageStyle, TextStyle, ViewStyle } from 'react-native';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
export const foxLogo = require('../../../images/branding/fox.png');
export const pageNotFound = require('images/page-not-found.png');
export const createDeepLinkModalNavDetails = createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.MODAL.DEEP_LINK_MODAL,
);
export type DeepLinkModalProps = {
    linkType: 'public' | 'private';
    onContinue: () => void;
    onBack?: () => void;
    pageTitle: string;
} | {
    linkType: 'invalid';
    onContinue?: () => void;
    onBack?: () => void;
}
export interface ModalImageProps {
    linkType: DeepLinkModalProps['linkType'];
    styles: Record<string, ImageStyle & ViewStyle & TextStyle>;
}

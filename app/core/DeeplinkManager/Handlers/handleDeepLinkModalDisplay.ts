import { InteractionManager } from 'react-native';
import { createDeepLinkModalNavDetails, DeepLinkModalProps } from '../../../components/UI/DeepLinkModal/constant';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import { store } from '../../../store';
import NavigationService from '../../../core/NavigationService';

const handleDeepLinkModalDisplay = (props: DeepLinkModalProps) => {
    const deepLinkModalDisabled = selectDeepLinkModalDisabled(store.getState());

    if (props.linkType === 'private' && deepLinkModalDisabled) {
        return;
    }
    InteractionManager.runAfterInteractions(() => {
        NavigationService.navigation.navigate(...createDeepLinkModalNavDetails(props));
    });
};

export default handleDeepLinkModalDisplay;

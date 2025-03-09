import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';

/**
 * @deprecated The `<CustomAlert />` component has been deprecated in favor of the new `<Toast>` component from the component-library.
 * Please update your code to use the new `<Toast>` component instead, which can be found at app/component-library/components/Toast/Toast.tsx.
 */
const CustomAlert = ({
  headerContent,
  titleText,
  bodyContent,
  buttonText,
  onPress,
  isVisible,
}) => {
  const { toastRef } = useContext(ToastContext);

  React.useEffect(() => {
    if (isVisible) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: titleText,
            isBold: true,
          },
          {
            label: bodyContent,
            isBold: false,
          },
        ],
        closeButtonOptions: {
          label: buttonText || strings('navigation.ok'),
          onPress,
        },
        hasNoTimeout: true,
      });
    }
  }, [isVisible, titleText, bodyContent, buttonText, onPress, toastRef]);

  return null;
};

CustomAlert.propTypes = {
  headerContent: PropTypes.node,
  titleText: PropTypes.string,
  bodyContent: PropTypes.node,
  buttonText: PropTypes.string,
  onPress: PropTypes.func,
  isVisible: PropTypes.bool,
};

export default CustomAlert;

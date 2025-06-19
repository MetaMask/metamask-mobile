import React, { useCallback, useRef, useEffect, useState, memo } from 'react';
import { View, Image } from 'react-native';
import { useDispatch } from 'react-redux';

import styleSheet from './DeepLinkModal.styles';
import { strings } from '../../../../locales/i18n';
import Text, {
    TextVariant,
    TextColor,
} from '../../../component-library/components/Texts/Text';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import Button, {
    ButtonVariants,
    ButtonWidthTypes,
    ButtonSize
} from '../../../component-library/components/Buttons/Button';
import { MetaMetricsEvents, IMetaMetricsEvent } from '../../../core/Analytics';
import Checkbox from '../../../component-library/components/Checkbox';
import { ScrollView } from 'react-native-gesture-handler';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { Box } from '../../../components/UI/Box/Box';
import { setDeepLinkModalDisabled } from '../../../actions/settings';
import BottomSheet, { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import {
    IconColor,
    IconName,
} from '../../../component-library/components/Icons/Icon';
import ButtonIcon, {
} from '../../../component-library/components/Buttons/ButtonIcon';

import { pageNotFound, foxLogo, ModalImageProps, DeepLinkModalProps } from './constant';


const ModalImage = memo(({ linkType, styles }: ModalImageProps) => {
    if (linkType === 'invalid') {
        return (
            <View style={styles.pageNotFoundImageContainer}>
                <Image source={pageNotFound} style={styles.pageNotFoundImage} />
            </View>
        );
    }
    return (
        <View style={styles.foxImageContainer}>
            <Image source={foxLogo} style={styles.foxImage} />
        </View>
    );
});
const DeepLinkModal = () => {
    const params = useParams<DeepLinkModalProps>();
    const { linkType, onContinue, onBack } = params;
    const pageTitle = params.linkType !== 'invalid' ? params.pageTitle : undefined;
    const { styles } = useStyles(styleSheet, {});
    const { trackEvent, createEventBuilder } = useMetrics();
    const bottomSheetRef = useRef<BottomSheetRef | null>(null);
    const [isChecked, setIsChecked] = useState(false);
    const dispatch = useDispatch();

    const LINK_TYPE_MAP = React.useMemo((): Record<DeepLinkModalProps['linkType'], {
        title: string;
        description: string;
        checkboxLabel?: string;
        event: IMetaMetricsEvent;
        eventContinue?: IMetaMetricsEvent;
        eventDismiss: IMetaMetricsEvent;
    }> => ({
        public: {
            title: strings('deep_link_modal.public_link.title'),
            description: strings('deep_link_modal.public_link.description', { pageTitle }),
            event: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_VIEWED,
            eventContinue: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED,
            eventDismiss: MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_DISMISSED,
        },
        private: {
            title: strings('deep_link_modal.private_link.title'),
            description: strings('deep_link_modal.private_link.description', { pageTitle }),
            event: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_VIEWED,
            eventContinue: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED,
            eventDismiss: MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_DISMISSED,
        },
        invalid:
        {
            title: strings('deep_link_modal.invalid.title'),
            description: strings('deep_link_modal.invalid.description'),
            event: MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_VIEWED,
            eventDismiss: MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_DISMISSED,
        },
    }), [pageTitle]);

    useEffect(() => {
        trackEvent(
            createEventBuilder(LINK_TYPE_MAP[linkType].event)
                .addProperties({
                    ...generateDeviceAnalyticsMetaData(),
                })
                .build(),
        );
    }, [trackEvent, createEventBuilder, linkType, LINK_TYPE_MAP]);

    const dismissModal = (cb?: () => void): void =>
        bottomSheetRef?.current?.onCloseBottomSheet(cb);

    const onDimiss = useCallback(() => {
        dismissModal(() => {
            const event = LINK_TYPE_MAP[linkType].eventDismiss;
            trackEvent(
                createEventBuilder(event)
                    .addProperties({
                        ...generateDeviceAnalyticsMetaData(),
                    })
                    .build(),
            );
            onBack?.();
        });
    }, [trackEvent, createEventBuilder, linkType, LINK_TYPE_MAP, onBack]);

    const onContinuePressed = useCallback(() => {
        dismissModal(() => {
            const eventContinue = LINK_TYPE_MAP[linkType].eventContinue;
            if (eventContinue) {
                trackEvent(
                    createEventBuilder(eventContinue)
                        .addProperties({
                            ...generateDeviceAnalyticsMetaData(),
                            pageTitle,
                        })
                        .build(),
                );
            }
            onContinue?.();
        });
    }, [trackEvent, createEventBuilder, linkType, onContinue, pageTitle, LINK_TYPE_MAP]);

    const onDontRemindMeAgainPressed = useCallback(() => {
        const event = isChecked ? MetaMetricsEvents.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_UNCHECKED : MetaMetricsEvents.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED;
        trackEvent(
            createEventBuilder(event)
                .addProperties({
                    ...generateDeviceAnalyticsMetaData(),
                })
                .build(),
        );
        dispatch(setDeepLinkModalDisabled(!isChecked));
        setIsChecked((prev) => !prev);
    }, [isChecked, trackEvent, createEventBuilder, dispatch]);

    const shouldShowCheckbox = linkType === 'private';
    const shouldShowPrimaryButton = linkType !== 'invalid';

    return (
        <BottomSheet isFullscreen style={styles.screen} ref={bottomSheetRef} isInteractable={false}>
            <Box style={styles.box}>
                <ButtonIcon
                    onPress={onDimiss}
                    iconName={IconName.Close}
                    iconColor={IconColor.Default}
                    testID="deep-link-modal-close-button"
                />
            </Box>
            <ScrollView contentContainerStyle={styles.content}>
                <ModalImage linkType={linkType} styles={styles} />
                <Text variant={TextVariant.HeadingLG} style={styles.title}>
                    {LINK_TYPE_MAP[linkType].title}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Alternative} style={styles.description}>
                    {LINK_TYPE_MAP[linkType].description}
                </Text>
            </ScrollView>
            {shouldShowCheckbox && <Box style={styles.checkboxContainer}>
                <Checkbox
                    label={strings('deep_link_modal.private_link.checkbox_label')}
                    isChecked={isChecked}
                    onPress={onDontRemindMeAgainPressed}
                />
            </Box>}
            {shouldShowPrimaryButton && <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('deep_link_modal.continue_button')}
                onPress={onContinuePressed}
                style={styles.actionButtonMargin}
            />}
        </BottomSheet >
    );
};

export default React.memo(DeepLinkModal);

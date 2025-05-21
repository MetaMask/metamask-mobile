import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useFlatConfirmation } from '../../hooks/ui/useFlatConfirmation';
import { TooltipModal } from '../UI/Tooltip/Tooltip';
import styleSheet from './hero.styles';

interface TitleProps {
  title: React.ReactNode | string;
  setIsModalVisible?: ((isModalVisible: boolean) => void);
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}

const Title = ({ title, setIsModalVisible, styles }: TitleProps) => {
  const isStringTitle = typeof title === 'string';

  return (
    <View style={styles.title}>
      {setIsModalVisible ? (
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          {isStringTitle ? (
            <Text style={styles.titleText} variant={TextVariant.HeadingLG}>
              {title}
            </Text>
          ) : (
            title
          )}
        </TouchableOpacity>
      ) : isStringTitle ? (
        <Text style={styles.titleText} variant={TextVariant.HeadingLG}>
          {title}
        </Text>
      ) : (
        title
      )}
    </View>
  );
};

interface HeroProps {
  componentAsset: React.ReactNode;
  subtitle?: string;
  title: React.ReactNode | string;
  tooltipModalProps?: {
    hasTooltip?: boolean;
    isEnabled?: boolean;
    content?: string;
    title?: string;
    testId?: string;
  };
}

/**
 * Hero component
 * @example
 *
 * <Hero
 *   componentAsset={<Asset />}
 *   subtitle="Subtitle"
 *   title={<Title />}
 *   tooltipModalProps={{ hasTooltip: true, isEnabled: true, content: 'Tooltip content', title: 'Tooltip title', testId: 'tooltip-modal' }}
 * />
 */
export const Hero = ({
  componentAsset,
  subtitle,
  title,
  tooltipModalProps = {},
}: HeroProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { isFlatConfirmation } = useFlatConfirmation();
  const { styles } = useStyles(styleSheet, {
    isFlatConfirmation,
  });

  return (
    <View style={styles.base}>
      {componentAsset}
      <Title
        title={title}
        setIsModalVisible={
          tooltipModalProps.isEnabled ? setIsModalVisible : undefined
        }
        styles={styles}
      />
      {subtitle && (
        <Text style={styles.subtitle} variant={TextVariant.BodyMD}>
          {subtitle}
        </Text>
      )}
      {tooltipModalProps.isEnabled && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={tooltipModalProps.content}
          title={tooltipModalProps.title}
          tooltipTestId={tooltipModalProps.testId}
        />
      )}
    </View>
  );
};

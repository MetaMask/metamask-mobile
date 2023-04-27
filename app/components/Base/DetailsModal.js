import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fontStyles } from '../../styles/common';
import Text from './Text';
import { useTheme } from '../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    modalContainer: {
      width: '100%',
      backgroundColor: colors.background.default,
      borderRadius: 10,
    },
    modalView: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      flexDirection: 'row',
      paddingHorizontal: 16,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 12,
      marginHorizontal: 24,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    closeIcon: { paddingTop: 4, position: 'absolute', right: 16 },
    body: {
      paddingHorizontal: 15,
    },
    section: {
      paddingVertical: 16,
      flexDirection: 'row',
    },
    sectionBorderBottom: {
      borderBottomColor: colors.border.muted,
      borderBottomWidth: 1,
    },
    column: {
      flex: 1,
    },
    columnEnd: {
      alignItems: 'flex-end',
    },
    sectionTitle: {
      ...fontStyles.normal,
      fontSize: 10,
      color: colors.text.alternative,
      marginBottom: 8,
    },
  });
const DetailsModal = ({ children }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.modalView}>
      <View style={styles.modalContainer}>{children}</View>
    </View>
  );
};

const DetailsModalHeader = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <View style={[styles.header, style]} {...props} />;
};
const DetailsModalTitle = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <Text style={[styles.title, style]} {...props} />;
};
const DetailsModalCloseIcon = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={[styles.closeIcon, style]} {...props}>
      <Ionicons color={colors.text.default} name={'ios-close'} size={38} />
    </TouchableOpacity>
  );
};
const DetailsModalBody = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <View style={[styles.body, style]} {...props} />;
};
const DetailsModalSection = ({ style, borderBottom, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[styles.section, borderBottom && styles.sectionBorderBottom]}
      {...props}
    />
  );
};
const DetailsModalSectionTitle = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <Text style={[styles.sectionTitle, style]} {...props} />;
};
const DetailsModalColumn = ({ style, end, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.column, end && styles.columnEnd, style]} {...props} />
  );
};

DetailsModal.Header = DetailsModalHeader;
DetailsModal.Title = DetailsModalTitle;
DetailsModal.CloseIcon = DetailsModalCloseIcon;
DetailsModal.Body = DetailsModalBody;
DetailsModal.Section = DetailsModalSection;
DetailsModal.SectionTitle = DetailsModalSectionTitle;
DetailsModal.Column = DetailsModalColumn;

/**
 * Any other external style defined in props will be applied
 */
const stylePropType = PropTypes.oneOfType([PropTypes.object, PropTypes.array]);

DetailsModal.propTypes = {
  children: PropTypes.node,
};

DetailsModalHeader.propTypes = {
  style: stylePropType,
};
DetailsModalTitle.propTypes = {
  style: stylePropType,
};
DetailsModalCloseIcon.propTypes = {
  style: stylePropType,
};
DetailsModalBody.propTypes = {
  style: stylePropType,
};
DetailsModalSection.propTypes = {
  style: stylePropType,
  /**
   * Adds a border to the bottom of the section
   */
  borderBottom: PropTypes.bool,
};
DetailsModalSectionTitle.propTypes = {
  style: stylePropType,
};
DetailsModalColumn.propTypes = {
  style: stylePropType,
  /**
   * Aligns column content to flex-end
   */
  end: PropTypes.bool,
};
export default DetailsModal;

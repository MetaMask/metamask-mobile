import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import ActionModal from '../ActionModal';
import { colors, fontStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/Device';
import { whatsNew } from './whatsNewList';
import AsyncStorage from '@react-native-community/async-storage';
import { CURRENT_APP_VERSION, LAST_APP_VERSION, WHATS_NEW_APP_VERSION_SEEN } from '../../../constants/storage';
import compareVersions from 'compare-versions';

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 24,
		maxHeight: Device.getDeviceHeight() - 200,
		flex: 1
	},
	button: {
		marginTop: 16,
		borderColor: colors.blue,
		borderWidth: 1,
		borderRadius: 50,
		padding: 12,
		paddingHorizontal: 34
	},
	buttonText: {
		color: colors.blue,
		textAlign: 'center',
		...fontStyles.normal,
		fontWeight: '500'
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 27,
		paddingHorizontal: 24
	},
	headerCenterAux: {
		flex: 1
	},
	headerClose: {
		flex: 1,
		alignItems: 'flex-end'
	},
	headerText: {
		...fontStyles.bold,
		fontSize: 18
	},
	newFeatureTitle: {
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 8
	},
	newFeatureText: {
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 22
	},
	buttonContainer: {
		flexDirection: 'row'
	},
	featureContainer: {
		marginBottom: 35,
		paddingHorizontal: 24
	}
});

const WhatsNewModal = props => {
	const [featuresToShow, setFeaturesToShow] = useState(null);

	useEffect(() => {
		const shouldShow = async () => {
			const whatsNewAppVersionSeen = await AsyncStorage.getItem(WHATS_NEW_APP_VERSION_SEEN);

			const currentAppVersion = await AsyncStorage.getItem(CURRENT_APP_VERSION);
			const lastAppVersion = await AsyncStorage.getItem(LAST_APP_VERSION);
			const isUpdate = !!lastAppVersion && currentAppVersion !== lastAppVersion;

			let showFeatures = [];

			whatsNew.forEach(feature => {
				const seen =
					!!whatsNewAppVersionSeen &&
					compareVersions.compare(whatsNewAppVersionSeen, feature.minAppVersion, '>=');

				console.log('seen', seen, whatsNewAppVersionSeen, feature.minAppVersion);

				if (seen) return;

				if (feature.onlyUpdates) {
					const updatingCorrect = feature.onlyUpdates && isUpdate;

					console.log('updatingCorrect', updatingCorrect, feature.onlyUpdates, isUpdate);

					if (!updatingCorrect) return;

					const lastVersionCorrect = compareVersions.compare(lastAppVersion, feature.maxLastAppVersion, '<');

					console.log('lastVersionCorrect', lastVersionCorrect, lastAppVersion, feature.maxLastAppVersion);

					if (!lastVersionCorrect) return;
				}

				const versionCorrect = compareVersions.compare(currentAppVersion, feature.minAppVersion, '>=');

				console.log('versionCorrect', versionCorrect, currentAppVersion, feature.minAppVersion);

				if (!versionCorrect) return;

				showFeatures = [...showFeatures, ...feature.features];
			});
			if (showFeatures.length) setFeaturesToShow(showFeatures);
		};
		shouldShow();
	}, []);

	const closeModal = async () => {
		setFeaturesToShow(false);
		const version = await AsyncStorage.getItem(CURRENT_APP_VERSION);
		await AsyncStorage.setItem(WHATS_NEW_APP_VERSION_SEEN, version);
	};

	const callButton = feature => {
		closeModal();
		feature.buttonPress && feature.buttonPress(props);
	};
	return (
		<ActionModal
			modalVisible={!!featuresToShow}
			displayCancelButton={false}
			displayConfirmButton={false}
			verticalButtons
			propagateSwipe
		>
			<View style={styles.wrapper} testID={'whats-new-modal'}>
				<View>
					<View style={styles.header}>
						<View style={styles.headerCenterAux} />
						<Text style={styles.headerText}>{strings('whats_new.title')}</Text>
						<View style={styles.headerClose}>
							<TouchableOpacity
								onPress={closeModal}
								hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
							>
								<Icon name="times" size={16} />
							</TouchableOpacity>
						</View>
					</View>
					{!!featuresToShow && (
						<ScrollView>
							<TouchableWithoutFeedback>
								<View>
									{featuresToShow.map((feature, index) => (
										<View key={index} style={styles.featureContainer}>
											<Text style={styles.newFeatureTitle}>
												{'\u2022'} {feature.title}
											</Text>
											<Text style={styles.newFeatureText}>{feature.text}</Text>
											<View style={styles.buttonContainer}>
												<TouchableOpacity
													style={styles.button}
													onPress={() => callButton(feature)}
												>
													<Text style={styles.buttonText}>{feature.buttonText}</Text>
												</TouchableOpacity>
											</View>
										</View>
									))}
								</View>
							</TouchableWithoutFeedback>
						</ScrollView>
					)}
				</View>
			</View>
		</ActionModal>
	);
};

export default WhatsNewModal;

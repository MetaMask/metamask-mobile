import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ImagePickerResponse, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ActionSheet from 'react-native-actionsheet';
import VideoRecorder from 'react-native-beautiful-video-recorder';
import PropTypes from 'prop-types';
import Text from '../../Base/Text';
import { strings } from '../../../../locales/i18n';
import { colors } from '../../../styles/common';
import CollectibleMedia from '../CollectibleMedia';

const styles = StyleSheet.create({
	mediaButton: {
		borderWidth: 1,
		borderColor: colors.blue,
		padding: 30,
		borderRadius: 5,
		marginBottom: 20,
	},
	buttonText: {
		color: colors.blue,
		fontSize: 16,
		textAlign: 'center',
	},
});

const MediaSelector = ({ setMediaToSend }) => {
	const [media, setMedia] = React.useState(null);

	const actionSheetRef = useRef();
	const videoRecorder = useRef();

	const handleChooseMedia = (index: number) => {
		switch (index) {
			case 1:
				launchCamera({ mediaType: 'photo' }, (response: ImagePickerResponse) => {
					console.log(response);
					if (response?.assets) {
						setMedia(response.assets[0]);
						setMediaToSend(response.assets[0]);
					}
				});
				break;
			case 2:
				launchCamera({ mediaType: 'video' }, (response: ImagePickerResponse) => {
					console.log(response);
					if (response?.assets) {
						setMedia(response.assets[0]);
						setMediaToSend(response.assets[0]);
					}
				});
				break;
			case 3:
				launchImageLibrary({ mediaType: 'mixed' }, (response: ImagePickerResponse) => {
					console.log(response);
					if (response?.assets) {
						setMedia(response.assets[0]);
						setMediaToSend(response.assets[0]);
					}
				});
				break;
		}
	};

	return (
		<View>
			{media ? (
				<CollectibleMedia
					collectible={{
						name: 'NFT',
						tokenId: 1,
						address: '0x',
						image: media.uri,
						animation: media.uri,
					}}
					cover
					renderAnimation
				/>
			) : (
				<TouchableOpacity style={styles.mediaButton} onPress={() => actionSheetRef.current?.show()}>
					<Text style={styles.buttonText}>Choose NFT Media</Text>
				</TouchableOpacity>
			)}
			<VideoRecorder ref={videoRecorder} />
			<ActionSheet
				ref={actionSheetRef}
				title={'Select action'}
				options={[strings('wallet.cancel'), 'Take a photo', 'Record video', 'Select from gallery']}
				cancelButtonIndex={0}
				onPress={handleChooseMedia}
			/>
		</View>
	);
};

MediaSelector.propTypes = {
	setMediaToSend: PropTypes.func,
};

export default MediaSelector;

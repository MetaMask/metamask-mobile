import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleMedia from '../CollectibleMedia';
import Text from '../../Base/Text';
import RemoteImage from '../../Base/RemoteImage';
import StyledButton from '../../UI/StyledButton';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import AntIcons from 'react-native-vector-icons/AntDesign';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	},
	basicsWrapper: {
		flex: 1,
		padding: 25,
		alignItems: 'center',
		justifyContent: 'center'
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 16
	},
	information: {
		marginTop: 24
	},
	content: {
		paddingTop: 8,
		lineHeight: 22
	},
	row: {
		marginVertical: 10
	},
	name: {
		fontSize: 24,
		marginBottom: 3
	},
	tokenId: {
		fontSize: 16,
		marginTop: 3
	},
	userContainer: {
		marginBottom: 16,
		flexDirection: 'row'
	},
	userImage: {
		width: 38,
		height: 38,
		borderRadius: 100,
		marginRight: 8,
		marginTop: 2
	},
	buttonContainer: {
		flexDirection: 'row',
		marginTop: 16
	},
	sendButton: {
		height: 54,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		marginRight: 9
	},
	iconButtons: {
		width: 54,
		height: 54,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		marginRight: 9
	},
	collectibleInfoContainer: {
		flexDirection: 'row',
		marginBottom: 12
	},
	collectibleInfoKey: {
		paddingRight: 10
	},
	collectibleInfoValue: {
		flex: 1
	},
	username: {
		marginBottom: 2
	},
	userInfoContainer: {
		justifyContent: 'center'
	}
});

/**
 * View that displays the information of a specific ERC-721 Token
 */
export default class CollectibleOverview extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the collectible to be displayed
		 */
		collectible: PropTypes.object,
		tradable: PropTypes.bool,
		onSend: PropTypes.func
	};

	renderImage = () => {
		const { collectible } = this.props;
		return <CollectibleMedia big renderAnimation collectible={collectible} />;
	};

	renderCollectibleInfoRow = (key, value, isLink) => {
		if (!value) return null;
		return (
			<View style={styles.collectibleInfoContainer} key={key}>
				<Text noMargin black bold big style={styles.collectibleInfoKey}>
					{key}
				</Text>
				<Text
					noMargin
					big
					link={isLink}
					right
					style={styles.collectibleInfoValue}
					numberOfLines={1}
					ellipsizeMode="middle"
				>
					{value}
				</Text>
			</View>
		);
	};

	renderCollectibleInfo = () => {
		const { collectible } = this.props;
		return [
			this.renderCollectibleInfoRow('Source', collectible?.imageOriginal, true),
			this.renderCollectibleInfoRow('Link', collectible?.externalLink, true),
			this.renderCollectibleInfoRow('Last Sold'),
			this.renderCollectibleInfoRow('Asset contract', collectible?.address, true)
		];
	};

	render = () => {
		const {
			collectible: { name, tokenId },
			collectible,
			tradable,
			onSend
		} = this.props;

		// TODO: Add favorited status here or directly from props
		const favorited = false;

		return (
			<View style={styles.wrapper}>
				<View style={styles.basicsWrapper}>
					<View>{this.renderImage()}</View>
				</View>

				<View style={styles.informationWrapper}>
					{collectible?.creator && (
						<View style={styles.userContainer}>
							<RemoteImage
								fadeIn
								placeholderStyle={{ backgroundColor: colors.white }}
								source={{ uri: collectible.creator.profile_img_url }}
								style={styles.userImage}
							/>
							<View style={styles.userInfoContainer}>
								{collectible.creator.user?.username && (
									<Text black bold noMargin big style={styles.username}>
										{collectible.creator.user.username}
									</Text>
								)}
								<Text black noMargin small>
									{collectible.contractName}
								</Text>
							</View>
						</View>
					)}
					<Text bold primary noMargin style={styles.name}>
						{name}
					</Text>
					<Text primary noMargin style={styles.tokenId}>
						{strings('unit.token_id')}
						{tokenId}
					</Text>

					<View style={styles.buttonContainer}>
						{tradable && (
							<StyledButton onPress={onSend} type={'rounded-normal'} containerStyle={styles.sendButton}>
								<Text link big bold noMargin>
									{strings('asset_overview.send_button')}
								</Text>
							</StyledButton>
						)}
						<StyledButton type={'rounded-normal'} containerStyle={styles.iconButtons}>
							<Text bold link noMargin>
								<EvilIcons name={Device.isIos() ? 'share-apple' : 'share-google'} size={32} />
							</Text>
						</StyledButton>
						<StyledButton type={'rounded-normal'} containerStyle={styles.iconButtons}>
							<Text link noMargin>
								<AntIcons name={favorited ? 'star' : 'staro'} size={24} />
							</Text>
						</StyledButton>
					</View>

					{collectible?.description && (
						<View style={styles.information}>
							<View style={styles.row}>
								<Text noMargin black bold big>
									{strings('collectible.collectible_description')}
								</Text>
								<Text noMargin black style={styles.content}>
									{collectible.description}
								</Text>
							</View>
						</View>
					)}
					<View style={styles.information}>{this.renderCollectibleInfo()}</View>
				</View>
			</View>
		);
	};
}

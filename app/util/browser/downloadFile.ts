import Share, { ShareOptions } from 'react-native-share';
import RNFetchBlob from 'rn-fetch-blob';

const downloadFile = async (downloadUrl: string) => {
	console.log('downloadFiles called');
	const { config, fs } = RNFetchBlob;
	// const dir = fs.dirs.DocumentDir;
	// const fileName = downloadUrl.split('/').pop();
	// const downloadPath = `${dir}/${fileName}`;
	config({ fileCache: true })
		.fetch('GET', downloadUrl)
		.then((res) => {
			//Showing alert after successful downloading
			console.log('downloadFiles res -> ', JSON.stringify(res));
			const filePath = res.path();
			const options: ShareOptions = {
				title: 'Save file',
				message: 'Where do you want this file to be saved?:',
				url: filePath,
				saveToFiles: true,
			};

			Share.open(options)
				.then((shareResponse) => {
					console.log('share result', shareResponse);
				})
				.catch((shareError) => {
					console.log('share err', shareError);
				});
		})
		.catch((err) => console.log('downloadFiles error', err));
};

export default downloadFile;

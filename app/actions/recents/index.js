export default function addRecent(recent) {
	return {
		type: 'ADD_RECENT',
		recent,
	};
}

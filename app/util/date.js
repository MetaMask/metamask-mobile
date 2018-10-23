export function toLocaleDateTime(timestamp) {
	const dateObj = new Date(timestamp);
	const date = dateObj.toLocaleDateString();
	const time = dateObj.toLocaleTimeString();
	return `${date} ${time}`;
}

export function toLocaleDate(timestamp) {
	return new Date(timestamp).toLocaleDateString();
}

export function toLocaleTime(timestamp) {
	return new Date(timestamp).toLocaleTimeString();
}

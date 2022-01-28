const clipAddress = (address: string, showHead: number, showTail: number) => {
	const length = address.length;
	if (showHead + showTail >= length) return address;
	return `${address.slice(0, showHead)}...${address.slice(length - showTail)}`;
};

export default {
	clipAddress,
};

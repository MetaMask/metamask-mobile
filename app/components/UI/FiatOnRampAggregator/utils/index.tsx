export const formatId = (id: string) => {
	if (!id) {
		return id;
	}

	return id.startsWith('/') ? id : '/' + id;
};

export const currencyToKeypadCurrency = ({
	denomSymbol,
	decimals,
	separator,
}: {
	denomSymbol: string;
	decimals: number;
	separator: string;
}) => ({
	symbol: denomSymbol,
	decimalSeparator: separator || null,
	decimals: decimals > 0 ? decimals : null,
});

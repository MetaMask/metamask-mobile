const formattedDeeplinkParsedValue = (value: string) => {
  const resolvedValue = Number(value).toLocaleString(undefined, {
    useGrouping: false,
  });
  return resolvedValue;
};

export default formattedDeeplinkParsedValue;

export function setSearchEngine(searchEngine) {
	return {
		type: 'SET_SEARCH_ENGINE',
		searchEngine
	};
}

export function setLockTime(lockTime) {
	return {
		type: 'SET_LOCK_TIME',
		lockTime
	};
}

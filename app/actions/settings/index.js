export function setSearchEngine(search_engine) {
	return {
		type: 'SET_SEARCH_ENGINE',
		search_engine
	};
}

export function setLockTime(lock_time) {
	return {
		type: 'SET_LOCK_TIME',
		lock_time
	};
}

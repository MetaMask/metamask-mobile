import onUrlSubmit from '.';

describe('Browser utils :: onUrlSubmit', () => {
	it('should sanitize url without protocol', () => {
		const url = onUrlSubmit('test.com');
		expect(url).toBe('https://test.com');
	});

	it('should respect the default protocol', () => {
		const url = onUrlSubmit('test.com', 'Google', 'http://');
		expect(url).toBe('http://test.com');
	});

	it('should generate a seach engine link if it we pass non url', () => {
		const keyword = 'test';
		const url = onUrlSubmit(keyword, 'Google');
		const expectedUrl = 'https://www.google.com/search?q=' + escape(keyword);
		expect(url).toBe(expectedUrl);
	});

	it('should choose the search engine based on the params', () => {
		const keyword = 'test';
		const url = onUrlSubmit(keyword, 'DuckDuckGo');
		const expectedUrl = 'https://duckduckgo.com/?q=' + escape(keyword);
		expect(url).toBe(expectedUrl);
	});

	it('should detect keywords with several words', () => {
		const keyword = 'what is a test';
		const url = onUrlSubmit(keyword, 'DuckDuckGo');
		const expectedUrl = 'https://duckduckgo.com/?q=' + escape(keyword);
		expect(url).toBe(expectedUrl);
	});

	it('should detect urls without path', () => {
		const input = 'https://metamask.io';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});

	it('should detect urls with empty path', () => {
		const input = 'https://metamask.io/';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});

	it('should detect urls with path', () => {
		const input = 'https://metamask.io/about';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});

	it('should detect urls with path and slash at the end', () => {
		const input = 'https://metamask.io/about';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});

	it('should detect urls with path and querystring', () => {
		const input = 'https://metamask.io/about?utm_content=tests';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});

	it('should detect urls with path and querystring with multiple params', () => {
		const input = 'https://metamask.io/about?utm_content=tests&utm_source=jest';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});

	it('should detect urls with querystring params with escape characters', () => {
		const input = 'https://some.com/search?q=what+is+going&a=i+dont+know';
		const url = onUrlSubmit(input, 'DuckDuckGo');
		expect(url).toBe(input);
	});
});

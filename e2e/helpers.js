export default class TestHelpers {
	static async waitAndTap(elementId) {
		await waitFor(element(by.id(elementId)))
			.toBeVisible()
			.withTimeout(8000);

		return element(by.id(elementId)).tap();
	}

	static tap(elementId) {
		return element(by.id(elementId)).tap();
	}

	static tapByText(text) {
		return element(by.text(text))
			.atIndex(0)
			.tap();
	}

	static tapAtPoint(elementId, point) {
		return element(by.id(elementId)).tapAtPoint(point);
	}

	static async typeText(elementId, text) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.waitAndTap(elementId);
		} else {
			await TestHelpers.tap(elementId);
		}
		return element(by.id(elementId)).typeText(text);
	}

	static async typeNumbers(elementId, text, submitLabel) {
		if (device.getPlatform() === 'android') {
			return TestHelpers.typeText(elementId, text);
		}

		await element(by.id(elementId)).replaceText(text.replace('\n', ''));
		return element(by.label(submitLabel))
			.atIndex(0)
			.tap();
	}

	static async typeTextAndHideKeyboard(elementId, text) {
		await TestHelpers.typeText(elementId, text + '\n');
		if (device.getPlatform() === 'android') {
			device.pressBack();
		}
	}

	static async selectAllAndClear(elementId) {
		await TestHelpers.tapByText('Select All');
		return element(by.id(elementId)).tapBackspaceKey();
	}

	static async tapAndLongPress(elementId) {
		await TestHelpers.tap(elementId);
		return element(by.id(elementId)).longPress();
	}

	static tapAlertWithButton(text) {
		if (device.getPlatform() === 'android') {
			return element(by.text(text))
				.atIndex(0)
				.tap();
		}

		return element(by.label(text))
			.atIndex(0)
			.tap();
	}

	static async swipe(elementId, direction) {
		await element(by.id(elementId)).swipe(direction);
	}

	static async scrollTo(scrollviewId, edge) {
		await element(by.id(scrollviewId)).scrollTo(edge);
	}

	static checkIfVisible(elementId) {
		return waitFor(element(by.id(elementId)))
			.toBeVisible()
			.withTimeout(10000);
	}

	static checkIfNotVisible(elementId) {
		return waitFor(element(by.id(elementId)))
			.toBeNotVisible()
			.withTimeout(10000);
	}

	static checkIfExists(elementId) {
		return expect(element(by.id(elementId))).toExist();
	}

	static checkIfHasText(elementId, text) {
		return expect(element(by.id(elementId))).toHaveText(text);
	}

	static checkIfElementWithTextIsVisible(text) {
		return expect(element(by.text(text)).atIndex(0)).toBeVisible();
	}

	static checkIfElementByTextIsVisible(text) {
		return expect(element(by.text(text))).toBeVisible();
	}

	static relaunchApp() {
		return device.launchApp({ newInstance: true });
	}

	static delay(ms) {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}
}

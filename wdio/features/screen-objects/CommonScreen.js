class CommonScreen {

    async isTextDisplayed(text) {
        await expect(Selectors.getXpathElementByText(text)).toBeDisplayed();
    }

    async isTextElementNotDisplayed(text) {
        await expect(Selectors.getXpathElementByText(text)).not.toBeDisplayed();
    }
}

export default new CommonScreen();

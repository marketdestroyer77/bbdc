const { By, Builder, until } = require("selenium-webdriver");
const { userIdSecret, passwordSecret } = require("./passwords");

const notifier = require("node-notifier");
const player = require("play-sound")((opts = {}));
const { Configuration, NopeCHAApi } = require("nopecha");
const { API_KEY, DESIRED_MONTHS, FULL_AUTO, GET_EARLIEST_WANTED_SLOT } = require("./config");
const { notifyEmail } = require("./notification");
const { initialise, login, correctUIBug } = require("./bbdc");
const configuration = new Configuration({
	apiKey: API_KEY,
});
const nopecha = new NopeCHAApi(configuration);

main();

async function main() {
	let driver = await new Builder().forBrowser("chrome").build();
	try {
		await bbdc(driver);
	} catch (error) {
		console.log(`💥error caught in main: ${error.message}`);
		await driver.quit();
		await main();
	}
}

async function bbdc(driver) {
	await initialise(driver);
	// throw new Error("test");
	await login(driver);
	await correctUIBug(driver);
	while (true) {
		await driver.sleep(1000);
	}
}

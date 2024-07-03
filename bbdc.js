const { By, Builder, until } = require("selenium-webdriver");
const { userIdSecret, passwordSecret } = require("./passwords");

const notifier = require("node-notifier");
const player = require("play-sound")((opts = {}));
const { Configuration, NopeCHAApi } = require("nopecha");
const { API_KEY, DESIRED_MONTHS, FULL_AUTO, GET_EARLIEST_WANTED_SLOT } = require("./config");
const { notifyEmail } = require("./notification");
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
		const message = error.message;
		console.log(`💥error caught in main: ${message}`);
		await driver.quit();
		const suspended = message.includes("//label[text()='Captcha']");
		if (suspended) return;
		await main();
	}
}

async function bbdc(driver) {
	await initialise(driver);
	// throw new Error("test");
	await login(driver);
	await correctUIBug(driver);
	// balance = await getBalance(driver);
	await clickBookingThenPractical(driver);
	await clickBookSlot(driver);
	await selectAndNextWithoutFixedInstructor(driver);
	while (true) {
		const monthButtons = await checkMonths(driver);

		if (!monthButtons) {
			await refreshBookings(driver, 3000);
			continue;
		}
		const month = monthButtons[0].text;

		await goToMonth(monthButtons[0]);
		const slot = await checkSlot(driver);
		if (!slot) {
			await refreshBookings(driver, 0);
			continue;
		}
		if (!FULL_AUTO) player.play("./aimer.mp3");
		const date = await slot.getText();
		const alreadySlot = !(await clickElement(driver, null, slot, 10));
		// if (alreadySlot) {
		// 	console.log(`😛already have same slot booked`);
		// 	refreshBookings(driver, 0);
		// 	continue;
		// }
		const startTime = await clickSlotSessionReturnStartTime(driver);
		const startDateObj = createDateObject(month, date, startTime);
		notifier.notify(`${startDateObj.toString()}`);
		// const minuteDiff = getMinuteDifference(startDateObj, GET_CHECK_BACK_WHEN());
		console.log(
			`🔥slot for the lesson at ${startDateObj.toString()} was found at ${new Date().toString()}`
		);
		try {
			if (GET_EARLIEST_WANTED_SLOT() > startDateObj) {
				console.log(`⌚ lesson is earlier than earliest wanted slot...`);
				await refreshBookings(driver, 0);
				continue;
			} else {
				console.log(`😍 attempting to book slot...`);
				await confirmBookSlot(driver);
			}
		} catch (error) {
			console.log(`⚠️ error occured after slot found, refreshing...`);
			await refreshBookings(driver, 0);
		}

		// race between 30s timeout, finding success div, and finding fail div
		let outcome;
		let confirmationEle;
		try {
			await driver.manage().setTimeouts({ implicit: 0.5 * 60 * 1000 });
			confirmationEle = await driver.findElement(By.css("div.bg_success, div.bg_fail"));
			const classNames = await confirmationEle.getAttribute("class");
			outcome = classNames.includes("success") ? "success" : "fail";
		} catch (error) {
			console.log(error.message);
			console.log(`⌚no booking success or fail response, probably captcha was wrong`);
			outcome = "timeout";
		} finally {
			await driver.manage().setTimeouts({ implicit: 2 * 60 * 1000 });
		}

		console.log("🚀 ~ bbdc ~ outcome:", outcome);
		if (outcome === "timeout") {
			await refreshBookings(driver, 0);
			continue;
		}
		if (outcome === "success") {
			await notifyEmail(new Date(), startDateObj.toString());
		}
		await refreshBookings(driver, 0);
		await clickBookSlot(driver);
		await selectAndNextWithoutFixedInstructor(driver);
		continue;
	}
}

async function initialise(driver) {
	await driver.get("https://booking.bbdc.sg/?#/booking/chooseSlot");
	await driver.manage().window().maximize();
	await driver.manage().setTimeouts({ implicit: 2 * 60 * 1000 });
}

async function login(driver) {
	const loginId = await driver.findElement(By.id("input-8"));
	await loginId.sendKeys(userIdSecret);
	const password = await driver.findElement(By.id("input-15"));
	await password.sendKeys(passwordSecret);
	const loginButton = await driver.findElement(By.css(".v-btn"));
	await loginButton.click();

	const captchaLabel = await driver.findElement(By.xpath("//label[text()='Captcha']"));
	const captchaInput = await captchaLabel.findElement(By.xpath("./following-sibling::*[1]"));
	const captchaSubmit = await driver.findElement(
		By.xpath("//span[@class='v-btn__content' and text()=' Verify ']")
	);
	await solveCaptcha(driver, captchaInput);
	await captchaSubmit.click();
}

async function correctUIBug(driver) {
	const courseSelection = await driver.findElement(By.xpath("//div[text()='Booking']"));
	try {
		await driver.manage().window().setRect({ width: 1024, height: 768 });
		await driver.manage().window().maximize();
	} catch {
		console.log(`🪟error correcting UI bug`);
	}
}

async function clickBookingThenPractical(driver) {
	await clickElement(
		driver,
		async () => await driver.findElement(By.xpath("//div[text()='Booking']"))
	);
	await clickElement(
		driver,
		async () => await driver.findElement(By.xpath("//div[text()='Practical']"))
	);
	await driver.sleep(1000);
}

async function clickBookSlot(driver) {
	await clickElement(driver, async () =>
		driver.findElement(By.css('button[data-v-003c2473][type="button"]'))
	);
}

async function selectAndNextWithoutFixedInstructor(driver) {
	await clickElement(
		driver,
		async () =>
			await driver.findElement(By.xpath("//label[text()='Book without fixed instructor']"))
	);
	await clickElement(
		driver,
		async () => await driver.findElement(By.xpath("//span[text()=' NEXT ']"))
	);
}

async function checkMonths(driver) {
	const slotsLoaded = await driver.findElement(By.xpath('//span[text()=" Dec\'24 "]'));
	const btnEles = await driver.findElements(By.css("span.v-btn__content"));
	const slotMonthBtns = [];
	for (const btn of btnEles) {
		const text = await btn.getText();
		if (DESIRED_MONTHS.includes(text)) {
			slotMonthBtns.push({ btn, text });
		}
	}

	let slotFound = slotMonthBtns.length > 0;
	if (!slotFound) return false;
	return slotMonthBtns;
}

async function refreshBookings(driver, delayMs) {
	// console.log(`refreshing...`);
	await driver.sleep(delayMs);
	await driver.navigate().refresh();
}

async function goToMonth(slotMonthBtn) {
	const slotFoundInCurrentMonth = getCurrentMonthYear() === slotMonthBtn.text;
	if (slotFoundInCurrentMonth) return;
	while (true) {
		try {
			await slotMonthBtn.btn.click();
		} catch (error) {
			continue;
		}
		break;
	}
}

async function checkSlot(driver) {
	await driver.manage().setTimeouts({ implicit: 8000 });
	let slotDate;
	try {
		slotDate = await driver.findElement(
			By.css(
				"button.v-btn.v-btn--fab.v-btn--round.v-btn--text.theme--light.v-size--default.primary--text"
			)
		);
	} catch (e) {
	} finally {
		await driver.manage().setTimeouts({ implicit: 2 * 60 * 1000 });
	}
	return slotDate || false;
}

async function clickSlotSessionReturnStartTime(driver) {
	const slotTimeEles = await driver.findElements(
		By.xpath("//p[@data-v-934f9ace][contains(text(), 'SESSION')]")
	);
	const firstSlot = await filterButtons(slotTimeEles, "SESSION");
	const sessionText = await firstSlot.getText();
	const sessionNo = sessionText.slice(-1);
	await firstSlot.click();
	return getStartTimeFromSession(sessionNo);
}

async function confirmBookSlot(driver) {
	try {
		const nextPriceBtns = await driver.findElements(By.css("span[data-v-ce733480].price"));
		await clickElement(driver, null, nextPriceBtns[1]); // for some reason there are 2 of the button in the dom and 1 is hidden, harcoded that second one is the right one
		const confirmBtns = await driver.findElements(By.css("span.v-btn__content"));
		const confirmBtn = await filterButtons(confirmBtns, "CONFIRM");
		await clickElement(driver, null, confirmBtn);
		// Find the label element with the text content "Captcha"
		const bookingCaptchaLabel = await driver.findElement(
			By.xpath("//label[text() = 'Captcha']")
		);
		const bookingCaptchaInput = await bookingCaptchaLabel.findElement(
			By.xpath("./following-sibling::input")
		);
		const captchaConfirmBtns = await driver.findElements(
			By.css("button[data-v-2bb1e0a3] span.v-btn__content")
		);
		const captchaConfirmBtn = await filterButtons(captchaConfirmBtns, "CONFIRM");

		await solveCaptcha(driver, bookingCaptchaInput);
		await captchaConfirmBtn.click();
	} catch (error) {
		console.error(`⚠️error caught in confirmBookSlot: ${error.message}`);
	}
}

// async function dontConfirmBookSlot(driver) {
// 	const nextPriceBtns = await driver.findElements(By.css("span[data-v-bdd56a82].price"));
// 	await nextPriceBtns[1].click(); // for some reason there are 2 of the button in the dom and 1 is hidden, harcoded that second one is the right one
// 	const confirmBtns = await driver.findElements(By.css("span.v-btn__content"));
// 	const confirmBtn = await filterButtons(confirmBtns, "CONFIRM");
// 	await clickElement(driver, null, confirmBtn);
// 	// Find the label element with the text content "Captcha"
// 	const bookingCaptchaLabel = await driver.findElement(By.xpath("//label[text() = 'Captcha']"));
// 	const bookingCaptchaInput = await bookingCaptchaLabel.findElement(
// 		By.xpath("./following-sibling::input")
// 	);
// 	const captchaConfirmBtns = await driver.findElements(
// 		By.css("button[data-v-2bb1e0a3] span.v-btn__content")
// 	);
// 	const captchaConfirmBtn = await filterButtons(captchaConfirmBtns, "CONFIRM");

// 	await solveCaptcha(driver, bookingCaptchaInput);
// 	// await captchaConfirmBtn.click();

// 	await driver.sleep(15000);
// }

// * UTILITY FUNCTIONS
async function solveCaptcha(driver, captchaInput) {
	await captchaInput.click();

	let captchaURLParsed = "";
	while (captchaURLParsed.length <= 100) {
		try {
			const captcha = await driver.findElement(By.css(".v-image__image"));
			const captchaURLRaw = await captcha.getCssValue("background-image");
			captchaURLParsed = captchaURLRaw.slice(5, -2);
		} catch (error) {
			console.log(error.message);
		}
	}
	const res = await Promise.race([autoCaptcha(), manualCaptcha()]);
	// console.log("🚀 ~ solveCaptcha ~ res:", res);
	return res;

	async function autoCaptcha() {
		let captchaAnswer;
		let solved = false;
		while (true) {
			try {
				[captchaAnswer] = await nopecha.solveRecognition({
					type: "textcaptcha",
					image_data: [`${captchaURLParsed}`],
				});
			} catch (error) {
				console.log(`auto solving of captcha failed: ${error.message}`);
				continue;
			}
			break;
		}
		await captchaInput.sendKeys(captchaAnswer);
		return "automatically entered";
	}

	async function manualCaptcha() {
		let enteredCaptcha = false;
		while (!enteredCaptcha) {
			const myType = await captchaInput.getAttribute("value");
			if (myType.length === 5) {
				enteredCaptcha = true;
				break;
			}
		}
		return "manually entered";
	}
}

async function getBalance(driver) {
	const ele = await driver.findElement(By.css("span.color_black"));
	const balanceText = await ele.getText();
	const balance = balanceText.slice(1);
	return +balance;
}

async function filterButtons(eleList, buttonIncludes) {
	for (const ele of eleList) {
		const text = await ele.getText();
		if (text.includes(buttonIncludes)) {
			return ele;
		}
	}
}

async function clickElement(
	driver,
	asyncFunctionThatReturnsTheElement = () => {},
	ele = false,
	timeoutSeconds = 60
) {
	const startTime = new Date();
	let element;
	if (ele) {
		element = ele;
	} else if (asyncFunctionThatReturnsTheElement) {
		element = await asyncFunctionThatReturnsTheElement();
	} else {
		console.log(`error in click element 💀`);
		console.log("🚀 ~ ele:", ele);
		console.log("🚀 ~ asyncFunctionThatReturnsTheElement:", asyncFunctionThatReturnsTheElement);
	}
	while (true) {
		try {
			const secondsSpentTrying = (new Date() - startTime) / 1000;
			if (secondsSpentTrying > timeoutSeconds) {
				console.log(`👆error trying to click element, the element is: ${element}`);
				return false;
			}
			await element.click();
		} catch {
			continue;
		}
		break;
	}

	return true;
}

function getCurrentMonthYear() {
	const date = new Date();
	const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const year = date.getFullYear().toString().slice(-2); // Get the last two digits of the year
	return `${month}'${year}`;
}

function getStartTimeFromSession(session) {
	switch (session) {
		case "1":
			return "0730";
		case "2":
			return "0920";
		case "3":
			return "1130";
		case "4":
			return "1320";
		case "5":
			return "1520";
		case "6":
			return "1710";
		case "7":
			return "1920";
		case "8":
			return "2110";
	}
}

function createDateObject(month, day, time) {
	// Parse month string to integer (1-12)
	const monthNum = new Date(month + " 01, 2024").getMonth() + 1;

	// Convert day and time strings to integers
	const dayInt = parseInt(day);
	const hours = parseInt(time.slice(0, 2));
	const minutes = parseInt(time.slice(2));

	// Create the Date object
	return new Date(2024, monthNum - 1, dayInt, hours, minutes);
}

module.exports = {
	initialise,
	login,
	correctUIBug,
};

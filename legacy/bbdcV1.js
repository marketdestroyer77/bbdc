const { By, Builder, until } = require("selenium-webdriver");
const { userIdSecret, passwordSecret } = require("../passwords");
const notifier = require("node-notifier");
const player = require("play-sound")((opts = {}));
const { Configuration, NopeCHAApi } = require("nopecha");

const configuration = new Configuration({
	apiKey: "7mziqodgdgn59kbs",
});
const nopecha = new NopeCHAApi(configuration);

const desiredMonths = ["APR'24", "MAY'24"];
const testing = true;
if (testing) desiredMonths.push("OCT'24");
let driver;

let startTime = new Date();
let refreshCount = 0;
console.log(startTime);

(async function bbdc() {
	driver = await new Builder().forBrowser("chrome").build();

	try {
		await getToBookingPage();
		await checkForSlots();
	} catch (e) {
		console.log("💥💥💥💥💥💥error caught in bbdc💥💥💥💥💥💥💥", e);
		await driver.quit();
		await bbdc();
	} finally {
		// await driver.quit();
	}
})();

async function getToBookingPage() {
	await driver.get("https://booking.bbdc.sg/?#/booking/chooseSlot");
	await driver.manage().window().maximize();
	await driver.manage().setTimeouts({ implicit: 99999999999 });
	// login
	// console.log(userIdSecret, passwordSecret);
	const loginId = await driver.findElement(By.id("input-8"));
	await loginId.sendKeys(userIdSecret);
	const password = await driver.findElement(By.id("input-15"));
	await password.sendKeys(passwordSecret);
	const loginButton = await driver.findElement(By.css(".v-btn"));
	await loginButton.click();
	//
	//

	//
	//

	// submit captcha manually
	const captchaLabel = await driver.findElement(By.xpath("//label[text()='Captcha']"));
	const captchaInput = await captchaLabel.findElement(By.xpath("./following-sibling::*[1]"));
	const captchaSubmit = await driver.findElement(
		By.xpath("//span[@class='v-btn__content' and text()=' Verify ']")
	);
	captchaInput.click();
	let enteredCaptcha = false;
	while (!enteredCaptcha) {
		const myType = await captchaInput.getAttribute("value");
		if (myType.length === 5) {
			enteredCaptcha = true;
			break;
		}
	}
	await captchaSubmit.click();
	const courseSelection = await driver.findElement(By.xpath("//div[text()='Booking']"));
	await driver.manage().window().setRect({ width: 1024, height: 768 });
	await driver.manage().window().maximize();

	while (true) {
		try {
			const practicalTab = await driver.findElement(By.xpath("//div[text()='Practical ']"));
			await practicalTab.click();
		} catch (error) {
			// console.log(`💚 waiting for dashboard to load and overlay to disappear...`);
			continue;
		}
		break;
	}
	await driver.sleep(1000);

	const bookSlot = await driver.findElement(By.css('button[data-v-003c2473][type="button"]'));
	await bookSlot.click();
	const withoutFixedInstructor = await driver.findElement(
		By.xpath("//label[text()='Book without fixed instructor']")
	);
	await withoutFixedInstructor.click();
	const nextBtn = await driver.findElement(By.xpath("//span[text()=' NEXT ']"));
	await nextBtn.click();
}

async function checkForSlots() {
	try {
		while (true) {
			const slotsLoaded = await driver.findElement(By.xpath('//span[text()=" Dec\'24 "]'));
			const btnEles = await driver.findElements(By.css("span.v-btn__content"));
			const slotMonthBtns = [];
			for (const btn of btnEles) {
				const text = await btn.getText();
				if (desiredMonths.includes(text)) {
					slotMonthBtns.push({ btn, text });
				}
			}

			let slotFound = slotMonthBtns.length > 0;
			if (!slotFound) {
				updateAndLogStats();
				await driver.sleep(3000);
				await driver.navigate().refresh();
				await driver.findElement(By.xpath('//span[text()=" Dec\'24 "]'));
				continue;
			}
			// notifier.notify("slot found");
			// player.play("./aimer.mp3", function (err) {
			// 	if (err) throw err;
			// });
			await driver.manage().window().maximize();
			const slotFoundInCurrentMonth = getCurrentMonthYear() === slotMonthBtns[0].text;
			if (!slotFoundInCurrentMonth) {
				while (true) {
					try {
						await slotMonthBtns[0].btn.click();
					} catch (error) {
						continue;
					}
					break;
				}
			}
			let slotDate;
			try {
				await driver.manage().setTimeouts({ implicit: 8000 });
				slotDate = await driver.findElement(
					By.css(
						"button.v-btn.v-btn--fab.v-btn--round.v-btn--text.theme--light.v-size--default.primary--text"
					)
				);
			} catch (error) {
				console.log(
					"💚💚💚💚💚 month found but no date shown💚💚💚💚💚💚💚💚",
					error,
					"💚💚💚💚💚💚💚💚💚💚💚💚💚💚💚"
				);
				await driver.manage().setTimeouts({ implicit: 120000 });
				await driver.navigate().refresh();
				updateAndLogStats();
				continue;
			}

			await driver.manage().setTimeouts({ implicit: 120000 });
			let slotDateClickable = false;
			while (!slotDateClickable) {
				try {
					await slotDate.click();
				} catch (error) {
					continue;
				}
				break;
			}
			const slotTimeEles = await driver.findElements(
				By.xpath("//p[@data-v-934f9ace][contains(text(), 'SESSION')]")
			);
			const firstSlot = await filterButtons(slotTimeEles, "SESSION");
			const sessionNo = await firstSlot.getText();
			notifier.notify(sessionNo);
			await firstSlot.click();

			const nextPriceBtns = await driver.findElements(By.css("span[data-v-bdd56a82].price"));
			await nextPriceBtns[1].click(); // for some reason there are 2 of the button in the dom and 1 is hidden, harcoded that second one is the right one
			const confirmBtns = await driver.findElements(By.css("span.v-btn__content"));
			const confirmBtn = await filterButtons(confirmBtns, "CONFIRM");
			await confirmBtn.click();
			// Find the label element with the text content "Captcha"
			const bookingCaptchaLabel = await driver.findElement(
				By.xpath("//label[text() = 'Captcha']")
			);
			const bookingCaptchaInput = await bookingCaptchaLabel.findElement(
				By.xpath("./following-sibling::input")
			);
			await bookingCaptchaInput.click();
			const captchaConfirmBtns = await driver.findElements(
				By.css("button[data-v-2bb1e0a3] span.v-btn__content")
			);
			const captchaConfirmBtn = await filterButtons(captchaConfirmBtns, "CONFIRM");

			let finalCaptchaURLParsed = "";
			while (finalCaptchaURLParsed.length <= 100) {
				try {
					const finalCaptcha = await driver.findElement(By.css(".v-image__image"));
					const finalCaptchaURLRaw = await finalCaptcha.getCssValue("background-image");
					finalCaptchaURLParsed = finalCaptchaURLRaw.slice(5, -2);
					console.log(
						"🚀 ~ getToBookingPage ~ finalCaptchaURLParsed:",
						finalCaptchaURLParsed
					);
				} catch (error) {
					console.log(error.message);
				}
			}
			const [captchaAnswer] = await nopecha.solveRecognition({
				type: "textcaptcha",
				image_data: [`${finalCaptchaURLParsed}`],
			});
			// console.log("🚀 ~ getToBookingPage ~ text:", text);
			await bookingCaptchaInput.sendKeys(captchaAnswer);

			// let enteredFinalCaptcha = false;
			// let val = 0;
			// while (!enteredFinalCaptcha) {
			// 	val = await bookingCaptchaInput.getAttribute("value");

			// 	if (val.length === 5) {
			// 		enteredFinalCaptcha = true;
			// 		break;
			// 	}
			// }

			await captchaConfirmBtn.click();
			await driver.sleep(10000);
		}
	} catch (error) {
		console.log(
			"⚠️⚠️⚠️⚠️⚠️ error caught in checkForSlots ⚠️⚠️⚠️⚠️",
			error,
			"✅✅ navigating back to bookings and retrying..."
		);
		// updateAndLogStats();
		// await driver.get("https://booking.bbdc.sg/?#/booking/chooseSlot");
		// await checkForSlots();
	}
}

async function filterButtons(eleList, buttonIncludes) {
	for (const ele of eleList) {
		const text = await ele.getText();
		if (text.includes(buttonIncludes)) {
			return ele;
		}
	}
}

function getCurrentMonthYear() {
	const date = new Date();
	const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
	const year = date.getFullYear().toString().slice(-2); // Get the last two digits of the year
	return `${month}'${year}`;
}

function getTimeDifference(date1, date2) {
	// Get the difference in milliseconds
	const differenceInMs = Math.abs(date2.getTime() - date1.getTime());

	// Convert milliseconds to hours and minutes
	const hours = Math.floor(differenceInMs / (1000 * 60 * 60));
	const minutes = Math.floor((differenceInMs % (1000 * 60 * 60)) / (1000 * 60));

	return { hours, minutes };
}

function updateAndLogStats() {
	refreshCount++;
	const runTime = getTimeDifference(startTime, new Date());
	console.log(`RUNTIME: ${runTime.hours} hours and ${runTime.minutes} minutes`);
	console.log(`Number of refreshes: ${refreshCount}`);
}

// rename to notification.js
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
	host: "smtp.ethereal.email",
	port: 587,
	auth: {
		user: "", // email here
		pass: "", // password here
	},
});
// async..await is not allowed in global scope, must use a wrapper
async function notifyEmail(bookedAt = "", slotTiming = "") {
	// send mail with defined transport object
	const info = await transporter.sendMail({
		from: '"Maddison Foo Koch 👻" <maddison53@ethereal.email>', // sender address
		to: "bar@example.com, baz@example.com", // list of receivers
		subject: `SLOT BOOKED: ${slotTiming}`, // Subject line
		text: `Slot booked at ${bookedAt} for lesson at ${slotTiming}`, // plain text body
		// html: "<b>Hello world?</b>", // html body
	});

	console.log("💌💌💌💌💌💌💌💌💌💌Message sent: %s", info.messageId);
	// Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}

// notifyEmail().catch(console.error);

module.exports = {
	notifyEmail,
};

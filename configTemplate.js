// rename or duplicate the file contents into a file called config.js
module.exports = {
	FULL_AUTO: false,
	DESIRED_MONTHS: ["MAY'24", "JUN'24", "JUL'24"],
	// DESIRED_MONTHS: ["MAY'24", "JUN'24", "JUL'24", "OCT'24"],
	GET_EARLIEST_WANTED_SLOT: () => {
		const date = new Date();
		date.setMonth(5 - 1); // month is zero indexed
		date.setDate(20);
		date.setHours(5); //
		date.setMinutes(0);
		return date;
	},
	// TODO: put your nopecha api key here
	API_KEY: "",
};

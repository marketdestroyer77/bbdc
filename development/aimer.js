const player = require("play-sound")((opts = {}));

// $ mplayer foo.mp3
player.play("./aimer.mp3", function (err) {
	if (err) throw err;
});

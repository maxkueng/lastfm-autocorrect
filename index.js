var util = require('util'),
	Transform = require('stream').Transform
	LastfmAPI = require('lastfmapi'),
	natural = require('natural'),
	soundEx = natural.SoundEx,
	avgDuration = null;

exports = module.exports = LastfmAutocorrectStream;

function merge (a, b) {
	var key;
	if (a && b) {
		for (key in b) {
			a[key] = b[key];
		}
	}
	return a;
};

function LastfmAutocorrectStream (apiKey) {
	if (!(this instanceof LastfmAutocorrectStream)) { return new LastfmAutocorrectStream(apiKey); }
	Transform.call(this, { objectMode: true });

	if (!apiKey) {
		return process.nextTick(function () {
			this.emit('error', new Error('Missing station API key'));
		}.bind(this));
	}

	this.apiKey = apiKey;
	this.lfm = new LastfmAPI({ api_key: apiKey });
}

util.inherits(LastfmAutocorrectStream, Transform);

LastfmAutocorrectStream.prototype.getLastfmTrackExtraInfo = function (track, callback) {
	function albumNeedsCorrection (original, suggestion) {
		if (original === suggestion) { return null; }

		var lev = natural.LevenshteinDistance(suggestion, original),
			sdx = soundEx.compare(suggestion, original);

		if (lev < 4 || sdx) {
			return suggestion;
		}

		return null;
	}

	var params = (track.trackMBID) ? { mbid: track.trackMBID } : { track: track.title, artist: track.artist };

	this.lfm.track.getInfo(params, function (err, info) {
		if (err) { return callback(err); }
		var trackInfo = {
			albumCorrected: false,
			albumMBID: null
		};

		if (info.duration) {
			avgDuration = (!avgDuration) ? +info.duration : Math.floor((avgDuration + +info.duration) / 2);
			trackInfo.duration = info.duration;
			trackInfo.durationEstimated = false;
		} else {
			trackInfo.duration = avgDuration;
			trackInfo.durationEstimated = true;
		}

		if (info.album && info.album.title) {
			if (albumNeedsCorrection(track.album, info.album.title)) {
				trackInfo.albumCorrected = true;
				trackInfo.album = info.album.title;
			}

			if (track.album === info.album.title) {
				trackInfo.albumMBID = info.album.mbid || null;
			}
		}

		callback(null, trackInfo);
	});
};

LastfmAutocorrectStream.prototype.getLastfmCorrection = function (track, callback) {
	this.lfm.track.getCorrection(track.artist, track.title, function (err, corrections) {
		if (err) { return callback(err); }

		var trackInfo = {
				trackCorrected: false,
				artistCorrected: false,
				trackMBID: null,
				artistMBID: null
			},
			correction,
			lfmTrack,
			lfmArtist;

		if (corrections.correction && corrections.correction.track) {
			correction = corrections.correction;
			lfmTrack = correction.track;
			lfmArtist = lfmTrack.artist;

			trackInfo.trackCorrected = (+correction['@attr'].trackcorrected === 1);
			trackInfo.artistCorrected = (+correction['@attr'].artistcorrected === 1),
			trackInfo.trackMBID = lfmTrack.mbid || null;
			trackInfo.artistMBID = lfmArtist.mbid || null;

			if (trackInfo.trackCorrected) { trackInfo.title = lfmTrack.name; }
			if (trackInfo.artistCorrected) { trackInfo.artist = lfmArtist.name; }
		}

		callback(null, trackInfo);
	});
}

LastfmAutocorrectStream.prototype._transform = function (data, enc, done) {
	var self = this;

	self.getLastfmCorrection(data, function (err, correction) {
		var track = {};

		track = merge(track, data);

		if (!err && correction) {
			track = merge(track, correction);
		}

		self.getLastfmTrackExtraInfo(track, function (err, extraInfo) {
			if (!err && extraInfo) {
				track = merge(track, extraInfo);
			}

			track.autocorrected = (track.trackCorrected || track.artistCorrected || track.albumCorrected);

			if (track.autocorrected) {
				track.original = data;
			}

			self.push(track);
			done();
		});

	});
};

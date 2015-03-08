var assign = require('object-assign');
var through2 = require('through2');
var LastfmAPI = require('lastfmapi');
var natural = require('natural');
var avgDuration = null;

exports = module.exports = function (apiKey) {

	if (!apiKey) { throw new Error('Last.fm API key is required'); }

	var lfm = new LastfmAPI({ api_key: apiKey });

	var stream = through2.obj(function (track, enc, next) {

		var newTrack = assign({}, track);

		getCorrection(track, function (err, correction) {
			assign(newTrack, correction);

			getExtraInfo(track, function (err, info) {
				assign(newTrack, info);

				if (newTrack.corrected) {
					assign(newTrack, { original: track });
				}

				stream.push(newTrack);
				next();
			});
		});

	});

	function albumNeedsCorrection (original, suggestion) {
		if (original === suggestion) { return false; }

		var lev = natural.LevenshteinDistance(suggestion, original);
		var sdx = natural.SoundEx.compare(suggestion, original);

		return (lev < 4 || sdx);
	}

	function getExtraInfo (track, callback) {
		var params = track.trackMBID
			? { mbid: track.trackMBID }
			: { track: track.title, artist: track.artist };

		lfm.track.getInfo(params, function (err, info) {
			var trackInfo = {
				albumCorrected: false,
				albumMBID: track.albumMBID,
				duration: avgDuration,
				durationEstimated: true
			};

			if (err) { return callback(null, trackInfo); }

			if (info.duration) {
				info.duration = +info.duration;

				avgDuration = (avgDuration === null)
					? +info.duration
					: Math.floor((avgDuration + info.duration) / 2);

				trackInfo.duration = info.duration;
				trackInfo.durationEstimated = false;
			}

			if (info.album && info.album.title) {
				if (albumNeedsCorrection(track.album, info.album.title)) {
					trackInfo.album = info.album.title;
					trackInfo.albumCorrected = true;
				}

				if (track.album === info.album.title) {
					trackInfo.albumMBID = info.album.mbid || trackInfo.albumMBID;
				}

				trackInfo.corrected = (trackInfo.corrected || trackInfo.albumCorrected);
			}

			callback(null, trackInfo);
		});
	}

	function getCorrection (track, callback) {
		lfm.track.getCorrection (track.artist, track.title, function (err, corrections) {
			var trackInfo = {
				trackCorrected: false,
				artistCorrected: false,
				albumCorrected: false,
				corrected: false,
				title: track.title,
				artist: track.artist,
				album: track.album,
				trackMBID: track.trackMBID,
				artistMBID: track.artistMBID,
				albumMBID: track.albumMBID
			};

			if (!err && corrections.correction && corrections.correction.track) {
				var correction = corrections.correction;
				var lfmTrack = correction.track;
				var lfmArtist = lfmTrack.artist;

				trackInfo.trackCorrected = !!correction['@attr'].trackcorrected;
				trackInfo.artistCorrected = !!correction['@attr'].trackcorrected;
				trackInfo.trackMBID = lfmTrack.mbid || trackInfo.trackMBID;
				trackInfo.artistMBID = lfmArtist.mbid || trackInfo.artistMBID;

				if (trackInfo.trackCorrected) { trackInfo.title = lfmTrack.name; }
				if (trackInfo.artistCorrected) { trackInfo.artist = lfmArtist.name; }

				trackInfo.corrected = (trackInfo.trackCorrected || trackInfo.artistCorrected);
			}

			callback(null, trackInfo);
		});
	}

	return stream;

};

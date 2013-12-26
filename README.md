lastfm-autocorrect
==================

A transform stream (objectMode) that attempts to auto-correct and
enhance track metadata using Last.fm's correction API, Levenstein
distance and SoundEx.

It does the following things:

 - Tries to correct the track title, artist name and album name. If any
   of these have been corrected the `autocorrected` property will be
   `true` and the corresponding boolean properties `trackCorrected`,
   `artistCorrected`, `albumCorrected` will be set.
 - If any of track title, artist name or album name have been corrected,
   the original data will be stored in the `original` property.
 - Will try to find the MBIDs (MusicBrainz IDs) for track title, artist
   name and album title and store them in `trackMBID`, `artistMBID`,
   `albumMBID` accordingly.
 - Sets a `duration` property containing the track duration in
   milliseconds. If Last.fm does not provide a duration, the average
   duration of all tracks that have passed through the stream will be
   used.

This module requires a [Last.fm API key](http://www.last.fm/api/account/create). 

## API

### `new LastfmAutocorrectStream(lastfmApiKey)`

 - `lastfmApiKey`: Your Last.fm API key

### Input Format

The stream takes JavaScript objects in the following format:

```
{
    title: "The track title",
    artist: "The artist name",
    album: "The album title"
}
```

## Example

```javascript
var LastfmAutocorrectStream = require('lastfm-autocorrect'),
    SomaStationStream = require('somastation'),
    through = require('through');

var LASTFM_API_KEY = 'YOUR_LASTFM_API_KEY';
var groovesalad = new SomaStationStream('groovesalad');
var autocorrect = new LastfmAutocorrectStream(LASTFM_API_KEY);

groovesalad
    .pipe(through(function (track) {
        console.log('Original:');
        console.log(track);
        this.queue(track);
    }))
    .pipe(autocorrect)
    .pipe(through(function (track) {
        console.log('Auto-corrected:');
        console.log(track);
    }))
```

Output:

```
Original:
{ artist: 'Global Communication', title: '9 25', album: '76 14' }

Auto-corrected:
{ artist: 'Global Communication',
  title: '9 25',
  album: '76.14',
  trackCorrected: false,
  artistCorrected: false,
  trackMBID: null,
  artistMBID: null,
  albumCorrected: true,
  albumMBID: null,
  duration: '578000',
  autocorrected: true,
  original: { artist: 'Global Communication', title: '9 25', album: '76 14' } }
```

## License

MIT License

Copyright (c) 2013 Max Kueng (http://maxkueng.com/)
 
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
 
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

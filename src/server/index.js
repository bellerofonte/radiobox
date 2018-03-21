const GPIO = require('./pin');
const MPC = require('mpc-js').MPC;
const config = require('./config.json');

let app = require('express')();
let server = require('http').Server(app);
let io = require('socket.io')(server, { transports: ['websocket'] });
let mpc = new MPC();
let pinBtn = new GPIO.Reader(config.pins.button);
let pinAmp = new GPIO.Writer(config.pins.amp);
let pinLed = new GPIO.Writer(config.pins.led);
let state = { };
let blinker = {
    handlePause: true,
    timeout: 0,
    timer: null,
    stationChanger: null
};

server.listen(80);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/index.js', (req, res) => {
    res.sendFile(__dirname + '/client/index.js');
});

app.get('/*.(ico|png)', (req, res) => {
    res.sendFile(__dirname + '/client/icons' + req.url);
});

const changeBlinking = (timeout) => {
    if (blinker.timeout === timeout)
        return; // do nothing
    if (blinker.timer) {
        clearInterval(blinker.timer);
    }
    blinker.timeout = timeout;
    if (timeout > 0) {
        // set up timer
        blinker.timer = setInterval(() => pinLed.toggle(), timeout);
        // and blink immediately, because timer will wait a timeout
        pinLed.toggle();
    } else {
        blinker.timer = null;
        pinLed.set(0); // turn LED on
    }
};

// create callback for all events
const readState = (target) => {
    mpc.status.status().then(
        obj => {
            mpc.status.currentSong().then(song => {
                const idx = song ? config.stations.findIndex(s => s.url === song.path) : -1;
                state = {
                    title: song ? (song.title || song.name || (idx > -1 ? config.stations[idx].title : ' ')) : ' ',
                    volume: obj.volume,
                    status: (obj.state === 'play' ? 'play' : 'pause'),
                    idx
                };
                // check if AMP should be switched off
                pinAmp.set(state.status !== 'play');
                // check state and if paused turn on blinker (slow)
                const tm = (pinBtn.get() === 1)
                    ? config.timeouts.fast
                    : ((state.status === 'play') ? 0 : config.timeouts.slow);
                changeBlinking(tm);
                // emit events if needed
                if (target)
                    target.emit('state', state);
            });
        });
};

const selectStation = (station, client) => {
    if (!station) return;
    mpc.status.currentSong().then(song => {
        if (song && song.path === station.url) { // check wanted station is the same with currently playing
            mpc.status.status().then(status => {
                if (status.state === 'play') {
                    client && readState(client); // if so, do nothing, just update state for that client
                } else {
                    mpc.playback.pause(false).catch(console.log);
                }
            }).catch(console.log);
        } else { // otherwise, push new item
            state = {
                title: station.title || '???',
                volume: state.volume || 100,
                status: 'play',
                idx: config.stations.findIndex(s => s.url === station.url)
            };
            io.emit('state', state);
            mpc.currentPlaylist.addId(station.url) // then play it and crop playlist
                .then(id => mpc.playback.playId(id)
                .then(() => cropPlaylist(id))).catch(console.log);
        }
    }).catch(console.log);
};

// Add a connect listener
io.on('connection', client => {
    // Success!  Now listen to messages to be received
    client.on('play', event => mpc.playback.play());
    client.on('pause', event => mpc.playback.pause(true));
    client.on('volume', event => event.volume && mpc.playbackOptions.setVolume(event.volume));
    client.on('station', event => selectStation(event.station, client));
    client.emit('stations', config.stations);
    readState(client);
});

mpc.on('changed-mixer', () => readState(io));
mpc.on('changed-player', () => readState(io));
mpc.on('changed-playlist', () => readState(io));

pinBtn.on('changed', (value) => {
    if (value) {
        // button is pressed
        // turn on blinker (fast)
        blinker.handlePause = true;
        if (blinker.stationChanger)
            clearTimeout(blinker.stationChanger);
        blinker.stationChanger = setTimeout(() => {
            if (blinker.stationChanger)
                clearTimeout(blinker.stationChanger);
            blinker.stationChanger = null;
            blinker.handlePause = false;
            const idx = (state.idx === undefined || state.idx === null) ? -1 : +state.idx;
            selectStation(config.stations[(idx + 1) % config.stations.length]);
        }, config.timeouts.next);
        changeBlinking(config.timeouts.fast);
    } else {
        if (blinker.handlePause) {
            if (blinker.stationChanger)
                clearTimeout(blinker.stationChanger);
            // toggle play/pause
            state.status === 'play'
                ? mpc.playback.pause(true)
                : mpc.playback.play();
        } else {
            readState(); // if do nothing - read state to decide what to do with LED
        }
    }
});

/*
    This is a sucker punch, that Volumio uses.
    MPD cannot read the whole playlist at once (I don't know why),
    but it does not properly load a part urls.
    So, we need to add new item to the playlist every time we want to switch station
    And it finally may cause too big playlist length.
    The workaround is to remove from playlist previous items (whose will never be used actuallly)
    if playlist's length is greater than 1
 */
const cropPlaylist = (id) => {
    mpc.currentPlaylist.playlistInfo().then(items => {
        if (items.length > 1) {
            items.filter(i => i.id !== id).forEach(i => mpc.currentPlaylist.deleteId(i.id));
        }
    });
};

mpc.connectUnixSocket('/run/mpd/socket')
    .then(() => mpc.playbackOptions.setRepeat(true))
    .then(() => pinBtn.setup())
    .then(() => pinAmp.setup())
    .then(() => pinLed.setup())
    .then(() => readState()) //read state for empty handler
    .catch(err => {
        console.log(err);
        // exit if there is no connection to mpd
        process.exit(1);
    });

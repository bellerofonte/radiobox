const Button = require('./button');
const Pin = require('./pin').Writer;
const MPC = require('mpc-js').MPC;
const config = require('./config.json');
const logger = (err) => console.log(err);

let app = require('express')();
let server = require('http').Server(app);
let io = require('socket.io')(server, { transports: ['websocket'] });
let mpc = new MPC();
let btnPlay = new Button(config.pins.buttonPlay, config.timeouts.longPress);
let btnVolD = new Button(config.pins.buttonVolDown, config.timeouts.longPress, config.timeouts.volume);
let btnVolU = new Button(config.pins.buttonVolUp, config.timeouts.longPress, config.timeouts.volume);
let pinSmooth = new Pin(config.pins.smooth);
let pinLedWhite = new Pin(config.pins.ledWhite);
let pinLedBlue = new Pin(config.pins.ledBlue);
let state = { };
let buttonHandler = {
    handlePause: true,
    timeout: 0,
    timerBlink: null,
    timerVolume: null
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

const updateBlinking = () => {
    if (btnPlay.isPressed() || btnVolD.isPressed() || btnVolU.isPressed()) {
        changeBlinking(config.timeouts.fast);
    } else {
        changeBlinking((state.status === 'play') ? 0 : config.timeouts.slow);
    }
};

const changeBlinking = (timeout) => {
    if (buttonHandler.timeout === timeout)
        return; // do nothing
    if (buttonHandler.timerBlink) {
        clearInterval(buttonHandler.timerBlink);
    }
    buttonHandler.timeout = timeout;
    if (timeout > 0) {
        // set up timer
        buttonHandler.timerBlink = setInterval(() => pinLedWhite.toggle().catch(logger), timeout);
        if (timeout === config.timeouts.slow) {
            pinLedWhite.set(1)
                .then(() => pinSmooth.set(1))
                .then(() => pinLedWhite.toggle())
                .catch(logger);
        } else {
            pinSmooth.set(0)
                .then(() => pinLedWhite.toggle())
                .catch(logger);
        }
    } else {
        buttonHandler.timerBlink = null;
        pinSmooth.set(0)
            .then(() => pinLedWhite.set(1))
            .catch(logger);
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
                //pinSmooth.set(state.status !== 'play');
                // TODO - mute amplifier for pause

                updateBlinking();
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
                    mpc.playback.pause(false).catch(logger);
                }
            }).catch(logger);
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
                .then(() => cropPlaylist(id))).catch(logger);
        }
    }).catch(logger);
};

// Add a connect listener
io.on('connection', client => {
    // Success!  Now listen to messages to be received
    client.on('play', event => mpc.playback.play().catch(logger));
    client.on('pause', event => mpc.playback.pause(true).catch(logger));
    client.on('volume', event => event.volume && mpc.playbackOptions.setVolume(event.volume).catch(logger));
    client.on('station', event => selectStation(event.station, client));
    client.emit('stations', config.stations);
    readState(client);
});

mpc.on('changed-mixer', () => readState(io));
mpc.on('changed-player', () => readState(io));
mpc.on('changed-playlist', () => readState(io));

btnPlay.on('down', () => {
    buttonHandler.handlePause = true;
});

btnPlay.on('long', () => {
    buttonHandler.handlePause = false;
    const idx = (state.idx === undefined || state.idx === null) ? -1 : +state.idx;
    selectStation(config.stations[(idx + 1) % config.stations.length]);
});

btnPlay.on('up', () => {
    if (buttonHandler.handlePause) {
        state.status === 'play'
            ? mpc.playback.pause(true)
            : mpc.playback.play();
    }
});

const changeVolume = (delta) => {
    mpc.status.status()
        .then(({volume}) => mpc.playbackOptions.setVolume(Math.max(0, Math.min(100, volume + delta))))
        .catch(logger);
};

btnVolD.on('down', () => changeVolume(-2));
btnVolD.on('hold', () => changeVolume(-2));

btnVolU.on('down', () => changeVolume(+2));
btnVolU.on('hold', () => changeVolume(+2));

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

/*
    Forces MPD to start playing if it does not yet
 */
const bootEmitter = {
    emit: (event, state) => {
        if (state.status === 'play') return;
        if (!state.title || state.title === ' ')
            selectStation(config.stations[0]);
        else
            mpc.playback.play().catch(logger);
    }
};

mpc.connectUnixSocket('/run/mpd/socket')
    .then(() => mpc.playbackOptions.setRepeat(true))
    .then(() => btnPlay.setup(updateBlinking))
    .then(() => btnVolD.setup(updateBlinking))
    .then(() => btnVolU.setup(updateBlinking))
    .then(() => pinSmooth.setup())
    .then(() => pinLedWhite.setup())
    .then(() => pinLedBlue.setup())
    .then(() => pinSmooth.set(0))           // turns of smooth blinking
    .then(() => pinLedWhite.set(1))         // turns on red LED
    .then(() => pinLedBlue.set(1))           // turns off red LED
    .then(() => readState(bootEmitter))     //read state for boot state handler
    .catch(err => {
        logger(err);
        // exit if there is no connection to mpd
        process.exit(1);
    });

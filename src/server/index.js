const logger = (err) => console.log(err);
const Button = require('./button');
const Pin = require('./pin').Writer;
const MPC = require('mpc-js').MPC;
const config = loadConfig();
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server, { transports: ['websocket'] });
const mpc = new MPC();
const btnPlay = new Button(config.pins.buttonPlay, config.timeouts.longPress);
const btnVolD = new Button(config.pins.buttonVolDown, config.timeouts.longPress, config.timeouts.volume);
const btnVolU = new Button(config.pins.buttonVolUp, config.timeouts.longPress, config.timeouts.volume);
const pinSmooth = new Pin(config.pins.smooth);
const pinLedWhite = new Pin(config.pins.ledWhite);
const pinLedBlue = new Pin(config.pins.ledBlue);
const state = { };
const buttonHandler = {
    handlePause: true,
    timeout: 0,
    timerBlink: null,
    timerVolume: null
};

server.listen(process.env.DEBUG === '1' ? 8000 : 80);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/index.js', (req, res) => {
    res.sendFile(__dirname + '/client/index.js');
});

app.get('/*.(ico|png)', (req, res) => {
    res.sendFile(__dirname + '/client/icons' + req.url);
});

function loadConfig() {
    const {stations, ...rest} = require('./config.json');
    return {
        stations: stations ? stations.map(([title, url]) => ({title, url})) : [],
        ...rest
    };
}

function updateBlinking() {
    if (btnPlay.isPressed() || btnVolD.isPressed() || btnVolU.isPressed()) {
        changeBlinking(config.timeouts.fast);
    } else {
        changeBlinking((state.status === 'play') ? 0 : config.timeouts.slow);
    }
}

function changeBlinking(timeout) {
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
}

function getSongInfo(song) {
    const idx = song ? config.stations.findIndex(s => s.url === song.path) : -1;
    const title = song ? (song.title || ' ') : ' ';
    const name = song ? (song.name || (idx > -1 ? config.stations[idx].title : ' ')) : ' ';
    const url = song ? (song.path || '') : '';
    return {name, title, idx, url};
}

// create callback for all events
function readState() {
    return mpc.status.status()
        .then(obj => {
            Object.assign(state, {
                volume: obj.volume,
                status: (obj.state === 'play' ? 'play' : 'pause')
            });
            return mpc.status.currentSong();
        })
        .then(song => {
            Object.assign(state, getSongInfo(song));
            // check if AMP should be switched off
            //pinSmooth.set(state.status !== 'play');
            // TODO - mute amplifier for pause
            updateBlinking();
            // emit events if needed
            return Promise.resolve(state);
        });
}

function selectStation(station) {
    if (!station) return;
    if (state.url === station.url) { // check wanted station is the same with currently playing
        if (state.status === 'play') {
            return onMpdEvent(); // if so, do nothing, just update state for clients
        } else {
            return mpc.playback.pause(false);
        }
    } else { // otherwise, push new item
        let playerId = null;
        return mpc.currentPlaylist.addId(station.url) // then play it and crop playlist
            .then(id => mpc.playback.playId(playerId = id))
            .then(() => cropPlaylist(playerId))
            .catch(logger);
    }
}

function setVolume(volume) {
    let vol = +volume;
    if (!isNaN(vol)) {
        vol = Math.max(0, Math.min(100, vol));
        return mpc.playbackOptions.setVolume(vol);
    }
    return Promise.reject('invalid volume');
}

function changeVolume(delta) {
    setVolume(state.volume + delta).catch(logger);
}

// Add a connect listener
io.on('connection', client => {
    // Success!  Now listen to messages to be received
    client.on('play', event => mpc.playback.play().catch(logger));
    client.on('pause', event => mpc.playback.pause(true).catch(logger));
    client.on('volume', event => setVolume(event.volume).catch(logger));
    client.on('station', event => selectStation(event.station).catch(logger));
    client.emit('stations', config.stations);
    client.emit('state', state);
});

const onMpdEvent = () => readState().then(s => io.emit('state', s)).catch(logger);

mpc.on('changed-mixer', onMpdEvent);
mpc.on('changed-player', onMpdEvent);

btnPlay.on('down', () => {
    buttonHandler.handlePause = true;
});

btnPlay.on('long', () => {
    buttonHandler.handlePause = false;
    const idx = (state.idx === undefined || state.idx === null) ? -1 : +state.idx;
    selectStation(config.stations[(idx + 1) % config.stations.length]).catch(logger);
});

btnPlay.on('up', () => {
    if (buttonHandler.handlePause) {
        state.status === 'play'
            ? mpc.playback.pause(true)
            : mpc.playback.play();
    }
});

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
    The workaround is to remove from playlist previous items (whose will never be used actually)
    if playlist's length is greater than 1
 */
function cropPlaylist(id) {
    return mpc.currentPlaylist.playlistInfo().then(items => {
        if (items.length > 1) {
            items.filter(i => i.id !== id).forEach(i => mpc.currentPlaylist.deleteId(i.id));
        }
    });
}

/*
    Forces MPD to start playing if it does not yet
 */
function handleBoot(state) {
    if (state.status === 'play') {
        return Promise.resolve();
    }
    return (!state.name || state.name === ' ')
        ? selectStation(config.stations[0])
        : mpc.playback.play();
}

function connectMpc() {
    return (process.env.DEBUG === '1')
        ? mpc.connectTCP(process.env.HOST, 6600)
        : mpc.connectUnixSocket('/run/mpd/socket');
}

connectMpc()
    .then(() => mpc.playbackOptions.setRepeat(true))
    .then(() => btnPlay.setup(updateBlinking))
    .then(() => btnVolD.setup(updateBlinking))
    .then(() => btnVolU.setup(updateBlinking))
    .then(() => pinSmooth.setup())
    .then(() => pinLedWhite.setup())
    .then(() => pinLedBlue.setup())
    .then(() => pinSmooth.set(0))           // turns of smooth blinking
    .then(() => pinLedWhite.set(1))         // turns on white LED
    .then(() => pinLedBlue.set(1))          // turns off blue LED
    .then(() => readState())                // read state
    .then(s => handleBoot(s))               // and call boot state handler
    .catch(err => {
        logger(err);
        // exit if there is no connection to mpd
        process.exit(1);
    });

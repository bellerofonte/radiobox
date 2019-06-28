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
const pinMute = new Pin(config.pins.mute);
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

server.listen(process.env.DEBUG === '1' ? 8001 : 80);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/index.js', (req, res) => {
    res.sendFile(__dirname + '/client/index.js');
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(__dirname + '/client/manifest.json');
});

app.get('/*.(ico|png)', (req, res) => {
    res.sendFile(__dirname + '/client/icons' + req.url);
});

function loadPlaylist(file, playlist) {
    const rawPlaylist = require(file);
    return rawPlaylist
        .filter(list => list.tracks && list.tracks.length > 0)
        .forEach((list) => {
            const pid = playlist.length;
            const tracks = list.tracks.map(([title, url, genre], tid) => ({title, url, genre, tid, pid}));
            playlist.push({title: list.title, pid, tracks, type: 'file'});
        });
}

function loadConfig() {
    const {pins, stations, include, timeouts, autoNext, ...rest} = require('./config.json');
    const playlist = [];
    if (stations && stations.length) {
        const tracks = stations.map(([title, url, genre], tid) => ({title, url, pid: 0, tid, genre}));
        playlist.push({title: 'Radio', pid: 0, tracks, type: 'radio'});
    }
    if (include) {
        loadPlaylist(include, playlist);
    }
    return {
        playlist,
        pins: pins || {},
        timeouts: timeouts || {},
        autoNext: !!autoNext,
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

function updateMute() {
    pinMute.set((state.status === 'play') ? 1 : 0);
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

function updateCurrentSong(song) {
    const url = song ? (song.path || '') : '';
    if (!url) {
        Object.assign(state, {tid: -1, pid: -1, title: ' ', name: ' ', url: ''});
        // mpc.currentPlaylist.clear();
        return;
    }
    // try to find song in the currently playing playlist
    const prevUrl = state.url;
    let pid = state.pid;
    let tid = pid > -1 ? config.playlist[pid].tracks.findIndex(track => track.url === url) : -1;
    // and if it isn't found
    if (tid === -1) {
        // try to find playlist to which the song belongs
        pid = config.playlist.findIndex(list => {
            tid = list.tracks.findIndex(track => track.url === url);
            return tid !== -1;
        });
    }
    const title = song.title || ' ';
    const name = song.name || (tid > -1 ? config.playlist[pid].tracks[tid].title : ' ');
    // update the state
    Object.assign(state, {tid, pid, title, name, url});
    if (prevUrl !== url) {
        // if current song has been changed - decide if we should push next track to MPD's queue or not
        // The only reason to push next track - is when playing track is file
        const autoNext = (tid > -1) && (pid > -1) && (config.playlist[pid].type === 'file');
        // first remove any other tracks from MPD's queue
        cropPlaylist(song.id)
            .then(() => {
                if (autoNext) {
                    // we have to add the next track to MPD's queue to ensure
                    const nextTid = (tid + 1) % config.playlist[pid].tracks.length;
                    return mpc.currentPlaylist.addId(config.playlist[pid].tracks[nextTid].url)
                }
                return Promise.resolve();
            })
            .then(() => mpc.playbackOptions.setRepeat(!autoNext))
            .catch(logger);
    }
}

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
            updateCurrentSong(song);
            updateMute();
            updateBlinking();
            return Promise.resolve(state);
        });
}

function selectSong(pid, tid) {
    if (pid < 0 || tid < 0 || pid >= config.playlist.length || tid >= config.playlist[pid].tracks.length) {
        return Promise.reject({message: 'wrong playlist id or track id'});
    }
    if (state.pid === pid && state.tid === tid) { // check wanted station is the same with currently playing
        if (state.status === 'play') {
            return onMpdEvent(); // if so, do nothing, just update state for clients
        } else {
            return mpc.playback.pause(false);
        }
    } else { // otherwise, push new item
        return mpc.currentPlaylist.addId(config.playlist[pid].tracks[tid].url)
            .then(id => mpc.playback.playId(id)) // then play it
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
    client.on('play', () => mpc.playback.play().catch(logger));
    client.on('pause', () => mpc.playback.pause(true).catch(logger));
    client.on('volume', event => setVolume(event.volume).catch(logger));
    client.on('select', event => selectSong(event.pid, event.tid).catch(logger));
    client.emit('playlist', config.playlist);
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
    const pid = state.pid === -1 ? 0 : state.pid;
    const tid = state.tid;
    selectSong(pid, (tid + 1) % config.playlist[pid].tracks.length).catch(logger);
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
            items.filter(i => i.id !== id).forEach(i => mpc.currentPlaylist.deleteId(i.id).catch(logger));
        }
        return Promise.resolve();
    });
}

/*
    Forces MPD to start playing if it does not yet
 */
function handleBoot(state) {
    if (state.status === 'play') {
        return Promise.resolve();
    }
    return (!state.url || state.url === ' ')
        ? selectSong(0, 0)
        : mpc.playback.play();
}

function connectMpc() {
    return (process.env.DEBUG === '1')
        ? mpc.connectTCP(process.env.HOST, 6600)
        : mpc.connectUnixSocket('/run/mpd/socket');
}

function checkPlaylist() {
    return config.playlist.length > 0
        ? Promise.resolve()
        : Promise.reject(new Error('Playlist should not be empty!'));
}

checkPlaylist()
    .then(() => connectMpc())
    .then(() => mpc.playbackOptions.setConsume(false))
    .then(() => mpc.playbackOptions.setRandom(false))
    .then(() => mpc.playbackOptions.setSingle(false))
    .then(() => btnPlay.setup(updateBlinking))
    .then(() => btnVolD.setup(updateBlinking))
    .then(() => btnVolU.setup(updateBlinking))
    .then(() => pinMute.setup())
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

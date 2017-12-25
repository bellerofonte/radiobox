const MPC = require('mpc-js').MPC;

const stations = require('./stations.json');
let app = require('express')();
let server = require('http').Server(app);
let io = require('socket.io')(server);
let mpc = new MPC();
let state = { };

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

// create callback for all events
const readState = (target) => {
    mpc.status.status().then(
        status => {
            mpc.status.currentSong().then(song => {
                state = {
                    title: song ? (song.title || song.name) : '',
                    volume: status.volume,
                    status: (status.state === 'play' ? 'play' : 'pause'),
                };
                target.emit('state', state);
            });
        });
};

// Add a connect listener
io.on('connection', client => {
    // Success!  Now listen to messages to be received
    client.on('play', event => mpc.playback.play());
    client.on('pause', event => mpc.playback.pause(true));
    client.on('volume', event => event.volume && mpc.playbackOptions.setVolume(event.volume));
    client.on('station', event => {
        const {station} = event;
        if (!station) return;
        mpc.status.currentSong().then(song => {
            if (song && song.path === station.url) { // check wanted station is the same with currently playing
                mpc.status.status().then(status => {
                    if (status.state === 'play') {
                        readState(client); // if so, do nothing, just update state for that client
                    } else {
                        mpc.playback.pause(false).catch(console.log);
                    }
                }).catch(console.log);
            } else { // otherwise, push new item
                mpc.currentPlaylist.addId(station.url) // then play it and crop playlist
                    .then(id => mpc.playback.playId(id).then(() => cropPlaylist(id))).catch(console.log);
            }
        }).catch(console.log);
    });
    client.emit('stations', stations);
    readState(client);
});

mpc.on('changed-mixer', () => readState(io));
mpc.on('changed-player', () => readState(io));
mpc.on('changed-playlist', () => readState(io));

/*
    This is a sucker punch, that Volumio uses.
    MPD cannot read the whole playlist at once (I don't know why),
    but it does not properly load a part urls.
    So, we need to add new item to the playlist every time we want to switch station
    And it finally may cause too big playlist length.
    The workaround is to remove from playlist previous items (whose will never be used actuallly)
    if playlist's length is greater than 10
 */
const cropPlaylist = (id) => {
    mpc.currentPlaylist.playlistInfo().then(items => {
        if (items.length > 10) {
            items.filter(i => i.id !== id).forEach(i => mpc.currentPlaylist.deleteId(i.id));
        }
    });
};

mpc.connectUnixSocket('/run/mpd/socket')
    .then(() => mpc.playbackOptions.setRepeat(true))
    .catch(err => {
        console.log(err);
        // exit if there is no connection to mpd
        process.exit(1);
    });
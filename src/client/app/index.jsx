import React from 'react';
import Player from './player';
import Selector from './selector';
import css from './index.css';
import WebSocket from 'socket.io-client';
import albumArt from './album-art';

const disconnectedUrl = (RADIOBOX_DEBUG === '1' ? '/icons' : '') + '/disconnected.png';
const defaultAlbumArt = (RADIOBOX_DEBUG === '1' ? '/icons' : '') + '/default-album-art.png';

const emptyState = {
    artist: 'No connection',
    track: '',
    status: '',
    icon: disconnectedUrl
};

export default class extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            ...emptyState,
            volume: 100,
            showVolume: false,
            stations: [],
            idx: -1
        };
        this.ws = null;
        this.connected = false;

        this.poll = (method_, params_) => {
            if (!this.connected) return;
            this.ws.emit(method_, params_);
        };

        this.doConnect = () => {
            if (this.connected || this.ws) return;
            this.ws = WebSocket(RADIOBOX_DEBUG === '1'
                ? RADIOBOX_HOST
                : window.location.href,
                {transports: ['websocket']});
            this.ws.on('connect', () => {
                this.connected = true;
            });
            this.ws.on('state', (state) => {
                const {title, name, ...rest} = state;
                let artist = null, track = null, icon = null;
                if (!title || title === ' ') {
                    artist = name || 'RadioBox';
                    track = '';
                    icon = defaultAlbumArt;
                } else {
                    const ar = title.split(' - ');
                    artist = ar[0] || name || 'RadioBox';
                    track = ar[1] || '';
                    if (track) { // we got real song here
                        this.updateAlbumArt(artist, track); // request album art
                    } else {
                        icon = defaultAlbumArt;
                    }
                }
                this.setState({artist, track, icon, ...rest});
            });
            this.ws.on('stations', (stations) => {
                this.setState({stations});
            });
            this.ws.on('disconnect', () => {
                this.connected = false;
                this.setState({...emptyState});
            });
        };

        this.playerSetVolume = (delta) => {
            const volume = Math.max(0, Math.min(100, this.state.volume + delta));
            this.poll('volume', {volume});
            this.setState({showVolume: true}, this.setShowVolume);
        };

        this.playerPlayPause = () => {
            this.poll(this.state.status === 'play' ? 'pause' : 'play');
        };

        this.setShowVolume = () => {
            if (this.volumeTimeout) {
                clearTimeout(this.volumeTimeout);
                this.volumeTimeout = null;
            }
            this.volumeTimeout = setTimeout(() => this.setState({showVolume: false}), 5000);
        };
    }

    componentDidMount() {
        this.doConnect();
    }

    selectStation(station) {
        this.setState({status: 'waiting'}, () => this.poll('station', {station}));
    }

    changeStation(delta) {
        const {idx, stations} = this.state;
        this.selectStation(stations[(idx + delta) % stations.length]);
    }

    requestAlbumArt(artist, track) {
        return albumArt(artist, track ? {album: track, size: 'mega'} : {size: 'mega'})
            .then(icon => Promise.resolve(icon))
            .catch(() => {
                if (track) { // if error - there is no image for {artist, track}
                    return this.requestAlbumArt(artist); // request just artist with empty album
                } else { // already requested artist without album
                    return Promise.resolve(defaultAlbumArt);
                }
            });
    }

    updateAlbumArt(newArtist, newTrack) {
        const {artist, track} = this.state;
        // or we have already requested the same icon
        if (newArtist === artist || newTrack === track) return;
        // save title that will be requested
        this.requestAlbumArt(newArtist, newTrack)
            .then(icon => {
                // check if it is still the same song
                if (this.state.artist === newArtist && this.state.track === newTrack) {
                    this.setState({icon})
                }
            });
    }

    render() {
        const {artist, track, icon, status, stations, volume, idx, showVolume} = this.state;
        return (
            <div className={css.container}>
                <Player artist={artist}
                        track={track}
                        icon={icon}
                        status={status}
                        playerSetVolume={this.playerSetVolume}
                        playerPlayPause={this.playerPlayPause}
                        playerChange={idx => this.changeStation(idx)}
                        volume={showVolume && volume}/>
                <Selector stations={stations}
                          selectedIdx={idx}
                          playerOpen={file => this.selectStation(file)}/>
            </div>
        );
    }
};

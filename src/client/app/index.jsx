import React from 'react';
import Player from './player';
import Selector from './selector';
import css from './index.css';
import IO from 'socket.io-client';

export default class extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            title: 'No connection',
            status: '',
            volume: 100,
            showVolume: false,
            stations: []
        };
        this.ws = null;
        this.connected = false;

        this.poll = (method_, params_) => {
            if (!this.connected) return;
            this.ws.emit(method_, params_);
        };

        this.doConnect = () => {
            if (this.connected || this.ws) return;
            this.ws = IO(window.location.href, { transports: ['websocket'] });
            this.ws.on('connect', () => {
                this.connected = true;
                //this.poll('getState');
            });
            this.ws.on('state', (state) => {
                this.setState(state);
            });
            this.ws.on('stations', (stations) => {
                this.setState({stations});
            });
            this.ws.on('disconnect', () => {
                this.connected = false;
                this.setState({title: 'No connection', status: ''});
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

    render() {
        const {title, status, stations, volume, showVolume} = this.state;
        return (
            <div className={css.container} >
                <Player title={title}
                        status={status}
                        playerSetVolume={this.playerSetVolume}
                        playerPlayPause={this.playerPlayPause}
                        volume={showVolume && volume} />
                <Selector stations={stations}
                          playerOpen={(file) => this.setState({status: 'waiting'},
                              () => this.poll('station', {station: file}))} />
            </div>
        );
    }
};
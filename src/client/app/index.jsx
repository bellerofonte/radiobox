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
            this.ws = IO('http://volumio.home');
            this.ws.on('connect', () => {
                this.connected = true;
                this.poll('getState');
            });
            this.ws.on('pushState', (data) => {
                this.state.stations.length
                    ? this.setState(data)
                    : this.setState(data, () => this.poll('browseLibrary', {uri: 'radio/favourites'}));
            });
            this.ws.on('pushBrowseLibrary', (data) => {
                if (this.state.stations.length) return; // stations are already loaded
                const stations = data.navigation.lists[0].items || [ ];
                this.setState({stations});
            });
            this.ws.on('disconnect', () => {
                this.connected = false;
                this.setState({title: 'No connection', status: ''});
            });
        };

        this.playerSetVolume = (delta) => {
            const volume = Math.max(0, Math.min(100, this.state.volume + delta));
            this.poll('volume', volume);
            this.setState({showVolume: true}, this.setShowVolume);
        };

        this.playerPlayPause = () => {
            this.poll('toggle');
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
                              () => this.poll('addPlay', file))} />
            </div>
        );
    }
};
import React from 'react';
import Player from './player';
import Selector from './selector';
import css from './index.css';

export default class extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            title: 'volume 100%',
            status: '',
            volume: 100,
            stations: []
        };
        this.timer = null;
        this.ws = null;
        this.connected = false;

        this.poll = (method_, params_) => {
            if (!this.connected) return;
            let msg = {
                'jsonrpc': '2.0',
                'method': method_,
                'id': method_
            };
            if (params_) {
                msg.params = params_;
            }
            this.ws.send(JSON.stringify(msg));
        };

        this.doConnect = () => {
            if (this.connected || this.ws) return;
            this.ws = new WebSocket('ws://osmc:9090/jsonrpc');
            this.ws.onopen = () => {
                this.connected = true;
                this.setState({title: 'connected to OSMC'},
                    () => this.poll('Player.GetProperties', {'playerid': 0, 'properties': ['speed']}));
            };
            this.ws.onclose = () => {
                this.connected = false;
                this.setState({title: 'disconnected from OSMC', status: ''}, this.stopTimer);
            };
            this.ws.onmessage = (e) => {
                console.log(e.data);
                var j = JSON.parse(e.data);
                if (j.id) // response
                {
                    switch(j.id) {
                        case "Player.GetProperties":
                            const playing = (j.result.speed || 0) === 1;
                            this.setState({status: playing ? 'playing' : 'paused'},
                                () => {
                                    this.poll('Files.GetDirectory', {'directory':'plugin://plugin.audio.radio_de/stations/my'})
                                    this.startTimer();
                                });
                            break;
                        case "Player.GetItem":
                            const item = j.result.item || { };
                            item.label && this.setState({title: item.label, status: 'playing'});
                            break;
                        case "Files.GetDirectory":
                            this.setState({stations: (j.result.files || [ ])});
                            break;
                    }
                }
                else // notification
                {
                    switch(j.method) {
                        case "Player.OnPlay":
                            this.setState({status: 'playing'}, this.getTitle);
                            break;
                        case "Player.OnStop":
                        case "Player.OnPause":
                            this.setState({status: 'paused'});
                            break;
                        case "Application.OnVolumeChanged":
                            const volume = Math.round(j.params.data.volume || 100);
                            this.setState({volume: volume, title: `volume ${volume}%`});
                            break;
                    }
                }
            }
        };

        this.playerSetVolume = (delta) => {
            const volume = Math.max(0, Math.min(100, this.state.volume + delta));
            this.poll('Application.SetVolume', {volume});
        };

        this.playerPlayPause = () => {
            this.poll('Player.PlayPause', {'playerid': 0});
        };

        this.startTimer = () => {
            console.log('start timer');
            if (this.timer) return;
            this.getTitle();
            this.timer = setInterval(this.getTitle, 5000);
        };

        this.stopTimer = () => {
            console.log('stop timer');
            this.timer && clearInterval(this.timer);
            this.timer = null;
        };

        this.getTitle = () => {
            this.state.status === 'playing' && this.poll('Player.GetItem', {'playerid': 0});
        };
    }

    componentDidMount() {
        this.doConnect();
    }

    render() {
        const {title, status, stations} = this.state;
        return (
            <div className={css.container} >
                <Player title={title}
                        status={status}
                        playerSetVolume={this.playerSetVolume}
                        playerPlayPause={this.playerPlayPause} />
                <Selector stations={stations}
                          playerOpen={(file) => this.setState({status: 'waiting'},
                              () => this.poll('Player.Open', {'item':{file}}))} />
            </div>
        );
    }
};
import React from 'react';
import css from './index.css';

const logoColor = { color: '#808691' };

const logoColorsAct = [
    { backgroundColor: '#ffe6e5', color: '#b45a5a'},
    { backgroundColor: '#d2f7d5', color: '#4e976f' },
    { backgroundColor: '#d7eff5', color: '#6288c3' },
    { backgroundColor: '#ffdfc6', color: '#e86d1d' },
    { backgroundColor: '#f2d3f7', color: '#8d53a3' }
];

const genreIcons = {
    rock: 'fas fa-fw fa-guitar',
    pop: 'fas fa-fw fa-headphones-alt',
    lounge: 'fas fa-fw fa-microphone',
    none: 'fas fa-fw fa-music',
};

const typeIcons = {
    radio: 'fas fa-fw fa-podcast',
    file: 'far fa-fw fa-folder',
    none: 'far fa-fw fa-folder',
};

export default class Selector extends React.Component {
    constructor(props) {
        super(props);
        const {playlist, pid} = props;
        const canMove = playlist.length > 1;
        this.state = {
            selectedRow: -1,
            selectedPid: canMove ? pid : 0,
            canMove
        };
        this.selectPlaylist = id => {
            if (id < -1 || id >= this.props.playlist.length) return;
            this.setState({selectedPid: id});
        };
        this.selectRow = index => this.setState({selectedRow: index});
    }

    renderRoot() {
        const {playlist, pid} = this.props;
        const items = playlist
            .map((list, index) => (
                <li key={index} onClick={() => this.selectPlaylist(index)}>
                    <div>
                        <div className={css.selectorLogo}
                             style={index === pid ? logoColorsAct[index % 5] : logoColor}>
                            <i className={typeIcons[list.type] || typeIcons.none}/>
                        </div>
                    </div>
                    <div className={css.selectorTitle}>{list.title}</div>
                </li>
            ));
        return (
            <div className={css.selectorBody}>
                <ul className={css.selectorList}>
                    <li key={Number.MAX_SAFE_INTEGER} className={css.selectorDummy}>
                        <td colSpan="2"/>
                    </li>
                    {items}
                </ul>
            </div>
        );
    }

    renderPlaylist(selectedPid) {
        const {playlist, tid, pid, playerOpen} = this.props;
        const {canMove} = this.state;
        const tracks = (playlist[selectedPid] || {}).tracks || [];
        const items = tracks.map((track, index) => (
            <li key={index} onClick={() => playerOpen(track)}>
                <div>
                    <div className={css.selectorLogo}
                         style={(index === tid && selectedPid === pid) ? logoColorsAct[index % 5] : logoColor}>
                        <i className={genreIcons[track.genre] || genreIcons.none}/>
                    </div>
                </div>
                <div className={css.selectorTitle}>{track.title}</div>
            </li>
        ));

        return (
            <div className={css.selectorBody}>
                <ul className={css.selectorList}>
                    <li key={Number.MAX_SAFE_INTEGER} className={css.selectorDummy}>
                        {'\xa0'}
                    </li>
                    {canMove &&
                    <li key={-1} onClick={() => this.selectPlaylist(-1)}>
                        <div>
                            <div className={css.selectorLogo} style={logoColor}>
                                <i className={'fas fa-fw fa-level-up-alt'}/>
                            </div>
                        </div>
                        <div className={css.selectorTitle}>..</div>
                    </li>
                    }
                    {items}
                </ul>
            </div>
        );
    }

    render() {
        const {selectedPid} = this.state;
        return selectedPid === -1 ? this.renderRoot() : this.renderPlaylist(selectedPid);
    }
}
import React from 'react';
import css from './index.css';

function getTitleStyle(title) {
    const ex = (title.length > 35)
        ? css.playerTitleSmaller
        : (title.length > 25 ? css.playerTitleSmall : '');
    return [css.playerTitle, ex].join(' ')
}

export default ({artist, track, icon, volume, status, playerChange, playerSetVolume, playerPlayPause}) => {
    const vStyle = {
        width: `${volume || 100}%`,
        backgroundColor: (volume ? 'black' : 'transparent'),
        height: '100%'
    };
    return (<div className={css.player}>
        <div className={css.playerIcon}>
            <img src={icon}/>
        </div>
        <div className={css.playerTitleBox}>
            <div className={getTitleStyle(artist)}>
                <b>{artist}</b>
            </div>
            <div className={getTitleStyle(track)}>
                {track}
            </div>
        </div>
        <div className={css.playerButtonSet}>
            <a className={css.playerBtn} onClick={() => playerSetVolume(-2)}>
                <i className="fas fa-fw fa-volume-down"/>
            </a>
            <a className={css.playerBtn} onClick={() => playerChange(-1)}>
                <i className="fas fa-fw fa-backward"/>
            </a>
            <a className={css.playerBtnPlay} onClick={playerPlayPause}>
                <i className={`fas fa-fw ${getStatusIcon(status)}`}/>
            </a>
            <a className={css.playerBtn} onClick={() => playerChange(1)}>
                <i className="fas fa-fw fa-forward"/>
            </a>
            <a className={css.playerBtn} onClick={() => playerSetVolume(2)}>
                <i className="fas fa-fw fa-volume-up"/>
            </a>
        </div>
        <div className={css.playerVolume}>
            <div style={vStyle}/>
        </div>
    </div>);
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'play': return 'fa-pause';
        case 'pause': return 'fa-play';
        case 'waiting': return 'fa-circle-notch fa-spin';
        default: return 'fa-exclamation-circle';
    }
};


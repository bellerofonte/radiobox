import React from 'react';
import css from './index.css';

export default ({artist, track, icon, volume, status, playerChange, playerSetVolume, playerPlayPause}) => {
    const vStyle = {
        width: `${volume || 100}%`,
        backgroundColor: (volume ? 'black' : 'transparent'),
        height: '100%'
    };
    const iconUrl = icon || '/default-album-art.png';
    return (<div className={css.player}>
        <div className={css.playerIcon}>
            <img src={iconUrl}/>
        </div>
        <div className={css.playerTitleBox}>
            <div className={css.playerTitle}>
                <b>{artist}</b>
            </div>
            <div className={css.playerTitle}>
                {track}
            </div>
        </div>
        <div className={css.playerButtonSet}>
            <a className={css.playerBtn} onClick={() => playerSetVolume(-2)}>
                <i className="fa fa-fw fa-volume-down"/>
            </a>
            <a className={css.playerBtn} onClick={() => playerChange(-1)}>
                <i className="fa fa-fw fa-backward"/>
            </a>
            <a className={css.playerBtnPlay} onClick={playerPlayPause}>
                <i className={`fa fa-fw ${getStatusIcon(status)}`}/>
            </a>
            <a className={css.playerBtn} onClick={() => playerChange(1)}>
                <i className="fa fa-fw fa-forward"/>
            </a>
            <a className={css.playerBtn} onClick={() => playerSetVolume(2)}>
                <i className="fa fa-fw fa-volume-up"/>
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
        case 'waiting': return 'fa-circle-o-notch fa-spin';
        default: return 'fa-exclamation-circle';
    }
};
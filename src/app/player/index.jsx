import React from 'react';
import css from './index.css';

export default ({title, status, playerSetVolume, playerPlayPause}) => {
    return (<div className={css.player}>
        <div className={css.playerInner}>
            <div className={css.playerTitleContainer}>
                <div className={css.playerTitle}>
                    <p>{title}</p>
                </div>
            </div>
            <div className={css.playerBtnSet}>
                <a className={css.playerBtnVolume} onClick={() => playerSetVolume(-10)}>
                    <i className="fa fa-fw fa-volume-down"/>
                </a>
                <a className={css.playerBtnPlay} onClick={playerPlayPause}>
                    <i className={`fa fa-fw ${getStatusIcon(status)}`}/>
                </a>
                <a className={css.playerBtnVolume} onClick={() => playerSetVolume(10)}>
                    <i className="fa fa-fw fa-volume-up"/>
                </a>
            </div>
        </div>
    </div>);
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'playing': return 'fa-pause';
        case 'paused': return 'fa-play';
        case 'waiting': return 'fa-spinner fa-pulse';
        default: return 'fa-exclamation-triangle';
    }
};
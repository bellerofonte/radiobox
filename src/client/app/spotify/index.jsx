import React from 'react';
import css from './index.css';

export default ({turnOff}) => {
    return (
        <div className={css.spotifyContainer}>
            <img className={css.spotifyLogo} src="Spotify_Logo_RGB_Green.png"/>
            <span>
                Spotify is currently playing on this device
            </span>
            <a className={css.spotifyButton} onClick={turnOff}>
                Switch to radio
            </a>
        </div>
    );
}
import React from 'react';
import css from './index.css';

const logoClasses = [ css.selectorLogo1, css.selectorLogo2, css.selectorLogo3, css.selectorLogo4, css.selectorLogo5 ];

export default ({stations, playerOpen}) => {
    const items = stations
        .filter(file => file.type === 'song')
        .map((file, index) => (
            <li key={index}  onClick={() => playerOpen(file.file)}>
                <span className={`${css.selectorLogo} ${logoClasses[index % 5]}`}><i className="fa fa-fw fa-music"/></span>
                <span className={css.selectorTitle}>{file.label}</span>
            </li>
        ));

    return (<div className={css.selector}>
        <div className={css.selectorInner}>
            <ul className={css.selectorList}>
                {items}
            </ul>
        </div>
    </div>);
};
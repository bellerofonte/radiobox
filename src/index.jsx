import {parse as parseQueryString} from 'querystringify';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
import './index.css';

const qs = parseQueryString(location.search);

ReactDOM.render(
    <App guid={qs.guid} interval={1000} />,
    document.querySelector('#root')
);

import  {parseJSON} from './parse';
import {alertObj} from './alert';

export const urlGet = (url, timeout) => {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.timeout = timeout || 10000;
        xhr.onload = function () {
            // parse response and add items here
            const data = parseJSON(xhr.responseText || xhr.statusText);
            (xhr.status >= 200 && xhr.status < 300)
                ? resolve(data)
                : reject(data);
        };
        xhr.ontimeout = () => reject(alertObj('timeout', 'HTTP', 'info'));
        xhr.onerror = () => reject(alertObj('error', 'HTTP', 'info'));

        // 2. Конфигурируем его: GET-запрос на URL
        xhr.open('GET', url, true);

        // 3. Отсылаем запрос
        xhr.send();
    });
};

export const urlPost = (url, data, timeout) => {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.timeout = timeout || 10000;
        xhr.onload = function () {
            // parse response and add items here
            const data = parseJSON(xhr.responseText || xhr.statusText);
            (xhr.status >= 200 && xhr.status < 300)
                ? resolve(data)
                : reject(data);
        };
        xhr.ontimeout = () => reject(alertObj('timeout', 'HTTP', 'info'));
        xhr.onerror = () => reject(alertObj('error', 'HTTP', 'info'));

        // 2. Конфигурируем его: GET-запрос на URL
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-type', 'application/json');

        // 3. Отсылаем запрос
        xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
    });
};


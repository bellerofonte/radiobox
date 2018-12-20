import axios from 'axios';

export default function (artist, options) {
    // Default options
    artist = artist.replace('&', 'and');
    const opts = Object.assign({
        album: null,
        size: null
    }, options);

    // Public Key on purpose
    const apiKey = '4cb074e4b8ec4ee9ad3eb37d6f7eb240';
    const sizes = ['small', 'medium', 'large', 'extralarge', 'mega'];
    const method = (opts.album === null) ? 'artist' : 'album';
    const url = 'https://ws.audioscrobbler.com' +
        encodeURI('/2.0/?format=json&api_key=' +
            apiKey +
            '&method=' + method +
            '.getinfo&artist=' + artist +
            (opts.album ? '&album=' + opts.album : ''));
    return axios.get(url)
        .then(resp => {
            const json = resp.data;
            if (json.error) {
                return Promise.reject(json.message || 'shit happened');
            }
            let output;
            if (json[method] && json[method].image) {
                // Get largest image, 'mega'
                const i = json[method].image.length - 2;
                output = json[method].image[i]['#text'];
            } else {
                // No image art found
                return Promise.reject(new Error('No results found'))
            }
            if (sizes.indexOf(opts.size) !== -1 && json[method] && json[method].image) {
                // Return specific image size
                json[method].image.forEach((e, i) => {
                    if (e.size === opts.size && e['#text']) {
                        output = e['#text'];
                    }
                })
            }
            return output
                ? Promise.resolve(output)
                : Promise.reject(new Error('No image found'));
        });
};
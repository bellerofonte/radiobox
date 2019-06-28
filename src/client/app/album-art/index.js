import axios from 'axios';

const baseUrl = 'https://ws.audioscrobbler.com/2.0/?format=json&autocorrect=1&api_key=1e36b33338920d554c1a2a99ac5648f6';
const sizes = {small: 0, medium: 1, large: 2, extralarge: 3, mega: 4};

function getImage(json) {
    // check if object contains 'image' key
    const {image} = (json || {});
    if (!image) {
        // No image art found
        return Promise.reject(new Error('No results found'))
    }
    let output = null, idx = -1, max = -1;
    // try to find maximum image size
    image.forEach((e, i) => {
        const sz = sizes[e.size] || -1;
        if (e['#text'] && sz > max) {
            idx = i;
            max = sz;
        }
    });
    // if found
    if (idx > -1) {
        output = image[idx]['#text'];
        // now, check if target image is last.fm stub image
        if (output.endsWith('2a96cbd8b46e442fc41c2b86b821562f.png')) {
            output = null;
        }
    }
    return output
        ? Promise.resolve(output)
        : Promise.reject(new Error('No image found'));
}

export default function (artist, track) {
    const artist_ = encodeURIComponent(artist);
    const hasTrack = !!track;
    const method = hasTrack ? 'track' : 'artist';
    const rest = hasTrack ? `&track=${encodeURIComponent(track)}` : '';
    const url = baseUrl + `&method=${method}.getinfo&artist=${artist_}${rest}`;
    return axios.get(url)
        .then(resp => {
            const data = resp.data;
            if (data.error || !data[method]) {
                return Promise.reject(data.message || 'shit happened');
            }
            const json = hasTrack ? (data[method].album) : data[method];
            return getImage(json);
        });
};


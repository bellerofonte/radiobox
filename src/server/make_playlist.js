const fs = require('fs');
const path = require('path');
const id3 = require('node-id3');

const dir_path = (!process.argv[2] ? __dirname : process.argv[2]) + '/';

const playlist = [];

function readDir(title, rel_path, abs_path, list) {
    const tracks = [];
    fs.readdirSync(abs_path)
        .filter(item => item[0] !== '.')
        .forEach(item => {
            const abs_path2 = abs_path + item;
            const rel_path2 = rel_path + item;
            const stat = fs.statSync(abs_path2);
            if (stat.isFile()) {
                addFile(rel_path2, abs_path2, tracks);
            } else if (stat.isDirectory()) {
                readDir(item, rel_path2 + '/', abs_path2 + '/', list);
            }
        });
    if (tracks.length > 0) {
        list.push({title, tracks});
    }
}

function addFile(rel_path, abs_path, tracks) {
    const tags = id3.read(abs_path);
    if (!tags) return;
    const {title, genre} = tags;
    if (title) {
        tracks.push([title, rel_path, genre]);
    } else {
        const name = path.basename(abs_path, path.extname(abs_path));
        tracks.push([name, rel_path, genre]);
    }
}

readDir('Default', '', dir_path, playlist);
fs.writeFileSync(__dirname + '/playlist.json', JSON.stringify(playlist, null, 4));

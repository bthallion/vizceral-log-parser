const fs = require('fs-extra');
const readline = require('readline');
const glob = require('glob');

const readFileLines = (filePath, listener) => {
    const reader = readline.createInterface({
        input: fs.createReadStream(filePath)
    });

    reader.on('line', listener);

    return new Promise((resolve) => {
        reader.on('close', resolve);
    });
};

const getMatchingFiles = (pattern, opts = {}) => {
    return new Promise((resolve, reject) => {
        glob(pattern, opts, (err, files) => {
            if (err) {
                reject(err);
            }
            resolve(files);
        });
    });
};

module.exports = fs;
module.exports.getMatchingFiles = getMatchingFiles;
module.exports.readFileLines = readFileLines;

const execute = require('./lib/execute');
const fs = require('./lib/fs-util');
const vizceralParser = require('./vizceral-parser');
let sessionStream;

const createSessionStream = () => {
    return new Promise((resolve) => {
        sessionStream = fs.createWriteStream('tmp/sessions.txt');
        sessionStream.on('open', resolve);
    });
};

const processSession = (session) => {
    sessionStream.write(session);
};

Promise.all([
        fs.emptyDir('tmp'),
        execute.setPermission('./sort.sh')
    ])
    .then(() => fs.getMatchingFiles('nginx/*'))
    .then(logs => Promise.all(logs.map(log => {
        return execute('node', {
            args: [
                'log-splitter.js',
                `--log=${log}`
            ]
        });
    })))
    .then(results => {
        const ips = new Set(results.join('').trim().split('\n'));
        return Promise.all(Array.from(ips).map(ip => {
            return execute('./sort.sh', {
                args: [ip]
            });
        }));
    })
    .then(() => Promise.all([
        createSessionStream(),
        fs.getMatchingFiles('tmp/*.log')
    ]))
    .then(([,logs]) => Promise.all(logs.map(log => {
        return execute('node', {
            args: [
                'session-parser.js',
                `--log=${log}`
            ],
            listener: processSession
        });
    })))
    .then(() => vizceralParser('tmp/sessions.txt'));

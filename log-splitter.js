const fs = require('./lib/fs-util');
const { argv } = require('yargs');

const { log } = argv;
const streamMap = new Map();
const bufferMap = new Map();
const delimiter = '@@@@@';

const formatLine = (line) => {
    const quoteSplit = line.split('"');
    const spaceSplit = line.split(' ');
    const ip = spaceSplit[0];
    const time = Date.parse(
        spaceSplit[3]
            .slice(1)
            .replace(':', ' ')
    );
    const [method, path, protocol] = quoteSplit[1].split(' ');
    const [status, size] = quoteSplit[2].trim().split(' ');
    const referrer = quoteSplit[3];
    const userAgent = quoteSplit[5];

    return [
        ip,
        time,
        method,
        path,
        protocol,
        status,
        size,
        referrer,
        userAgent
    ].join(delimiter);
};

fs.readFileLines(log, (line) => {
        if (!line.trim()) {
            return;
        }

        const [ip] = line.split(' ');

        if (ip === '127.0.0.1') {
            // These are Docker health checks
            return;
        }

        const fileName = `${ip} ${process.pid} ${log.split('/').pop()}`;
        let stream = streamMap.get(ip);

        if (!stream) {
            stream = fs.createWriteStream(`tmp/${fileName}`);
            streamMap.set(ip, stream);
            bufferMap.set(ip, []);
            process.stdout.write(ip + '\n');
            stream.on('open', () => {
                const bufferedLines = bufferMap.get(ip);
                bufferMap.delete(ip);

                if (bufferedLines.length) {
                    stream.write(bufferedLines.join('\n') + '\n');
                }
            });
        }

        const bufferedLines = bufferMap.get(ip);

        if (bufferedLines) {
            bufferedLines.push(formatLine(line));
        } else {
            stream.write(`${formatLine(line)}\n`);
        }
    })
    .then(() => {
        for (let ip of streamMap.keys()) {
            const stream = streamMap.get(ip);
            const bufferedLines = bufferMap.get(ip);

            if (bufferedLines) {
                stream.on('open', () => stream.end());
            } else {
                stream.end();
            }
        }
    })
    .catch(err => console.error(err));

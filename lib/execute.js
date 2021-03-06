const { spawn } = require('child_process');

// Spawn another process, run a command, and return the result
const execute = (command, opts = {}) => {
    const {
        cwd,
        args = [],
        listener = () => {},
        silent = false
    } = opts;
    const childProc = spawn(command, args, { cwd, shell: true });
    let output = '';
    let errorOutput = '';

    childProc.stdout.on('data', (buffer) => {
        const data = buffer.toString();
        process.stdout.write(data);
        listener(data);
        output += data;
    });

    childProc.stderr.on('data', (buffer) => {
        const data = buffer.toString();
        process.stderr.write(data);
        errorOutput += data;
    });

    return new Promise((resolve, reject) => {
        childProc.on('exit', (code) => {
            if (code === 0) {
                resolve(output);
            }

            reject(`Error running: ${command} ${args.join(' ')}`);
        });
    });
};

const setPermission = (filePath) => {
    return execute('chmod', {
        args: [
            'u+x',
            filePath
        ]
    });
};

module.exports = execute;
module.exports.setPermission = setPermission;

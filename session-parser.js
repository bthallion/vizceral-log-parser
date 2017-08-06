const { argv } = require('yargs');
const { URL } = require('url');
const fs = require('./lib/fs-util');
const { log } = argv;
const loginPath = '/j_spring_security_check';
const logoutPath = '/j_spring_security_logout';
const rootPath = '/';
const idPattern = /id:[a-zA-Z0-9-]*/g;
const hrefPattern = /href:[^\/\?]*/g;
const scanPattern = /\/[a-zA-Z0-9-]*\/scan-bom-entries/g;
// Timeout after an hour
const sessionTimeout = 36000000;
const delimiter = '@@@@@';

let currentSession = [];

const terminateSession = (finalRequest) => {
    if (finalRequest) {
        currentSession.push(final);
    }

    if (currentSession.length === 1 && [rootPath, loginPath].includes(currentSession[0].path)) {
        // Don't include sessions that are just logins
        return;
    }

    process.stdout.write(JSON.stringify(currentSession) + '\n');
};

const createSession = (firstRequest) => {
    currentSession = firstRequest ? [firstRequest] : [];
};

const isResourceRequest = (pathname) => {
    return ['.css', '.jpg', '.png', '.js', '.woff2', '.json'].some(ext => {
        return ext === pathname.slice(-1 * ext.length);
    });
};

const isNotificationRequest = (pathname) => {
    return path !== '/ui/notifications' && ['notifications', 'notification-counts'].some(ext => {
        return ext === pathname.slice(-1 * ext.length);
    });
};

const getPath = (url) => {
    return url.pathname
        .replace(idPattern, 'id:')
        .replace(hrefPattern, 'href:')
        .replace(scanPattern, '')
};

fs.readFileLines(log, (line) => {
        const [
            ip,
            time,
            method,
            rawPath,
            protocol,
            status,
            size,
            rawReferrer,
            userAgent
        ] = line.split(delimiter);
        const pathUrl = new URL(rawPath, 'http://localhost');
        const referrerUrl = rawReferrer === '-' ? null : new URL(rawReferrer);
        const path = pathUrl.pathname
            .replace(idPattern, 'id:')
            .replace(hrefPattern, 'href:');
        const referrer = referrerUrl && referrerUrl.pathname
            .replace(idPattern, 'id:')
            .replace(hrefPattern, 'href:');
        const referrerHost = referrerUrl && referrerUrl.hostname;

        if (isResourceRequest(path) || isNotificationRequest(path)) {
            return;
        }

        const request = {
            ip,
            time,
            method,
            path,
            protocol,
            status,
            size,
            referrer,
            referrerHost,
            userAgent
        };

        if (Number(status) >= 400) {
            return;
        }

        const lastReq = currentSession.length ? currentSession[currentSession.length - 1] : null;

        if (!lastReq) {
            currentSession.push(request);
            return;
        }

        const didLogin = path === loginPath;
        const didLogout = path === logoutPath;
        const didTimeout = request.time - lastReq.time >= sessionTimeout;

        if (didLogout) {
            terminateSession(request);
            createSession();
        } else if (didLogin || didTimeout) {
            terminateSession(null);
            createSession(request);
        } else if (request.referrer !== null) {
            currentSession.push(request);
        }
    })
    .then(() => {
        terminateSession();
    });

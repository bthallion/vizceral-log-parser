const fs = require('./lib/fs-util');

const trafficScale = 5;
const rootName = 'New Hub Session';
const rootNode = {
    name: rootName,
    renderer: 'focusedChild',
    // this max volume is the total number of sessions
    maxVolume: 0,
    class: 'normal'
};
const containerNode = {
    renderer: 'region',
    name: 'Hub',
    class: 'normal',
    updated: 1466838546805,
    maxVolume: 0,
    // Each node will be a referrer
    // the max volume will be the total number of requests
    nodes: null,
    // the normal metrics between two nodes will go up for each connection
    // maybe by a factor of ten
    connections: null
};
const vizceralConfig = {
    renderer: 'global',
    name: 'edge',
    nodes: [containerNode]
};
const nodeMap = new Map();
const connectionMap = new Map();

const getNode = (pathname) => {
    let node = nodeMap.get(pathname);

    if (!node) {
        node = {
            name: pathname,
            renderer: 'focusedChild',
            maxVolume: 0,
            class: 'normal'
        };
        nodeMap.set(pathname, node);
    }

    return node;
};

const getConnection = ({ source, target }) => {
    if (source === target) {
        return null;
    }
    
    const connectionKey = `${source} -> ${target}`;
    let connection = connectionMap.get(connectionKey);

    if (!connection) {
        connection = {
            source,
            target,
            metrics: {
                normal: 0
            },
            class: 'normal'
        };
        connectionMap.set(connectionKey, connection);
    }

    return connection;
};

const addToGraph = ({ source, target }) => {
    if (source === rootName) {
        rootNode.maxVolume += trafficScale;
    }

    const node = getNode(target);
    const connection = getConnection({ source, target });

    if (connection) {
        connection.metrics.normal += trafficScale;
        node.maxVolume += trafficScale;
    }
};

const parseVizceralData = (sessions) => {
    // make sure to try to parse out a last node from the last request path (check for ui request)
    return fs.readFileLines(sessions, (sessionJson) => {
            const session = JSON.parse(sessionJson);
            let lastRequest = {};
            session.forEach((request, index) => {
                const isFinalRequest = index === session.length - 1;
                const { referrer, path } = request;
                const lastReferrer = lastRequest.referrer || rootName;

                if (!referrer) {
                    return;
                }

                addToGraph({ source: lastReferrer, target: referrer });

                if (isFinalRequest && path.includes('/ui/')) {
                    // Try to parse out a final node if it's a ui request
                    addToGraph({ source: referrer, target: path });
                }

                lastRequest = request;
            });
        })
        .then(() => {
            containerNode.nodes = [rootNode, ...Array.from(nodeMap.values())];
            containerNode.connections = Array.from(connectionMap.values());
            const stream = fs.createWriteStream('tmp/config.json');
            stream.on('open', () => {
                stream.write(JSON.stringify(vizceralConfig));
            })
        });
};

module.exports = parseVizceralData;

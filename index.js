'use strict';

const http = require('http'),
    spawn = require('child_process').spawn,
    yargs = require('yargs');
const server = http.createServer(handler);

const args = yargs.options('p', {
    alias: 'port',
    'default': 8080,
    describe: 'port to listen on'
}).options('a', {
    alias: 'address',
    'default': '127.0.0.1',
    describe: 'Ip address to listen on'
}).options('r', {
    alias: 'remotes',
    'default': ['127.0.0.1'],
    describe: 'remote hosts allowed to make requests',
    type: 'array'
}).argv;

console.log(args);
server.listen(args.port, args.address);

function handler(request, response) {
    const address = request.connection.remoteAddress;
    if (args.remotes.indexOf(address) < 0) {
        response.write(address + 'is not an authorized remote requester');
        response.end();
    } else if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function () {
            const args = body.split(/\s+/),
                command = args.shift();
            const child = spawn(command, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            child.stdout.on('data', (data) => response.write(data));
            child.stderr.on('data', (data) => response.write(data));
            child.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    response.writeHead(404);
                } else {
                    response.writeHead(500);
                }
                response.write(JSON.stringify(err));
                response.write('\n');
                response.end();
            });
            child.on('close', () => response.end());
        });
    } else {
        response.writeHead(400);
        response.write('Request must be a post containing comand to execute');
        response.end();
    }
}
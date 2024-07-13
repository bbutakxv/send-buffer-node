const net = require('net');

module.exports = function(RED) {
    function SendBufferNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.url = config.url;
        node.buffer = JSON.parse(config.buffer);
        node.interval = config.interval;
        node.closeAfterSend = config.closeAfterSend;

        let client;
        let intervalID;

        function connectAndSend() {
            const [host, port] = node.url.split(':');
            client = new net.Socket();

            client.connect(port, host, function() {
                client.write(Buffer.from(node.buffer), function() {
                    if (node.closeAfterSend) {
                        client.end();
                    }
                });
            });

            client.on('data', function(data) {
                node.send({ payload: data.toString() });
            });

            client.on('error', function(error) {
                node.error(error);
                client.destroy();
            });

            client.on('close', function() {});
        }

        function sendBuffer() {
            if (node.closeAfterSend) {
                connectAndSend();
            } else {
                if (!client || client.destroyed) {
                    const [host, port] = node.url.split(':');
                    client = new net.Socket();

                    client.connect(port, host, function() {});

                    client.on('error', function(error) {
                        node.error(error);
                        client.destroy();
                    });

                    client.on('close', function() {});
                }

                if (client && client.writable) {
                    client.write(Buffer.from(node.buffer));
                } else {
                    node.warn("Нет активного соединения для отправки данных.");
                }
            }
        }

        node.on('input', function(msg) {
            if (msg.url) node.url = msg.url;
            if (msg.buffer) node.buffer = JSON.parse(msg.buffer);
            if (msg.interval) node.interval = msg.interval;
            if (msg.closeAfterSend !== undefined) node.closeAfterSend = msg.closeAfterSend;

            clearInterval(intervalID);
            intervalID = setInterval(sendBuffer, node.interval * 1000);
        });

        node.on('close', function() {
            clearInterval(intervalID);
            if (client) {
                client.destroy();
            }
        });

        intervalID = setInterval(sendBuffer, node.interval * 1000);
    }

    RED.nodes.registerType("send-buffer-node", SendBufferNode);
}

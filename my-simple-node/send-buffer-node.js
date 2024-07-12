const net = require('net');

module.exports = function(RED) {
    function SendBufferNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.url = config.url;
        node.buffer = JSON.parse(config.buffer);
        node.interval = config.interval;

        let intervalID;

        function sendBuffer() {
            const [host, port] = node.url.split(':');
            const client = new net.Socket();

            client.connect(port, host, function() {
                client.write(Buffer.from(node.buffer));
            });

            client.on('data', function(data) {
                node.status({ fill: "green", shape: "dot", text: "sent" });
                node.send({ payload: data.toString() });
                client.destroy();
            });

            client.on('error', function(error) {
                node.status({ fill: "red", shape: "ring", text: "failed" });
                node.error(error);
                client.destroy();
            });

            client.on('close', function() {
            });
        }

        node.on('input', function(msg) {
            clearInterval(intervalID);
            if (msg.url) node.url = msg.url;
            if (msg.buffer) node.buffer = JSON.parse(msg.buffer);
            if (msg.interval) node.interval = msg.interval;
            intervalID = setInterval(sendBuffer, node.interval * 1000);
        });

        node.on('close', function() {
            clearInterval(intervalID);
        });

        intervalID = setInterval(sendBuffer, node.interval * 1000);
    }

    RED.nodes.registerType("send-buffer-node", SendBufferNode);
}

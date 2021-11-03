const formatProfileConnections = (profileConnections) => {
  const connections = profileConnections;
  let connectionsSentArr = [];
  let connectionsReceivedArr = [];
  let connectionsConnectedArr = [];

  if (connections?.sent) {
    connectionsSentArr = Object.values(connections.sent);
  }

  if (connections?.received) {
    connectionsReceivedArr = Object.values(connections.received);
  }

  if (connections?.connected) {
    connectionsConnectedArr = Object.values(connections.connected);
  }

  const connectionsData = {
    sent: connectionsSentArr,
    received: connectionsReceivedArr,
    connected: connectionsConnectedArr,
  };

  return connectionsData;
}

module.exports = formatProfileConnections;

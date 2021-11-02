const handleProfileConnections = (profileConnections) => {
  const connections = profileConnections;
  const connectionsSentArr = connections.sent ?
    Object.keys(connections.sent).map((key) => ({ ...connections.sent[key] })) : [];
  const connectionsReceivedArr = connections.received ?
    Object.keys(connections.received).map((key) => ({ ...connections.received[key] })) : [];
  const connectionsConnectedArr = connections.connected ?
    Object.keys(connections.connected).map((key) => ({ ...connections.connected[key] })) : [];

  const connectionsData = {
    sent: connectionsSentArr,
    received: connectionsReceivedArr,
    connected: connectionsConnectedArr,
  };

  return connectionsData;
}

module.exports = handleProfileConnections;

const getAttributes = require('../utils/get-attributes');

module.exports = (types, listenNode, applicationIdentifier) => {
	const listenIdentifier = types.identifier('listen');
	const memberExpression = types.memberExpression(applicationIdentifier, listenIdentifier);
  const { port, host, /* backlog, */ callback } = getAttributes(types, listenNode);
  const callExpressionArguments = [];
  if (port) callExpressionArguments.push(types.numericLiteral(port));
  if (host) callExpressionArguments.push(types.stringLiteral(host));
  if (callback) callExpressionArguments.push(callback);
	return types.callExpression(memberExpression, callExpressionArguments);
};

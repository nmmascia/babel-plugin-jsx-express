const getAttributes = require('../utils/get-attributes');

module.exports = (types, listenNode, applicationIdentifier) => {
	const listenIdentifier = types.identifier('listen');
	const memberExpression = types.memberExpression(applicationIdentifier, listenIdentifier);
  const { port, /* host, backlog, callback */ } = getAttributes(types, listenNode);
	return types.callExpression(memberExpression, [ types.numericLiteral(port) ]);
};

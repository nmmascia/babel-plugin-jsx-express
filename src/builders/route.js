const getElementAttributes = require('../utils/get-element-attributes');
const buildMiddleware = require('./middleware');

module.exports = (types, node, parentIdentifier) => {
	const routeIdentifier = types.identifier('route');
	const memberExpression = types.memberExpression(parentIdentifier, routeIdentifier);
	const { path } = getElementAttributes(types, node);
	const routeCallExpression = types.callExpression(memberExpression, [ types.stringLiteral(path) ]);
	return types.react.buildChildren(node).reduce((lastCallExpression, child) => {
		return buildMiddleware(types, child, lastCallExpression);
	}, routeCallExpression);
};

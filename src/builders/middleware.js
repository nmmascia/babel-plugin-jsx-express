const getElementName = require('../utils/get-element-name');
const getElementAttributes = require('../utils/get-element-attributes');

module.exports = (types, node, parentIdentifier) => {
	const middlewareIdentifier = types.identifier(getElementName(node));
	const { path, callback } = getElementAttributes(types, node);
	const memberExpression = types.memberExpression(parentIdentifier, middlewareIdentifier);
	const callExpressionArguments = [];
	if (path) callExpressionArguments.push(types.stringLiteral(path));
	if (callback) callExpressionArguments.push(callback);
	return types.callExpression(memberExpression, callExpressionArguments);
};

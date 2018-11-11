module.exports = (types, appIdentifier) => {
	const expressIdentifier = types.identifier('express');
	const variableDeclarator = types.variableDeclarator(appIdentifier, types.callExpression(expressIdentifier, []));
	return types.variableDeclaration('const', [ variableDeclarator ]);
};

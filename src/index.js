const buildApp = require('./builders/app');
const buildListen = require('./builders/listen');
const buildMiddleware = require('./builders/middleware');
const buildRoute = require('./builders/route');
const getElementName = require('./utils/get-element-name');

module.exports = function({ types }) {
	return {
		inherits: require('@babel/plugin-syntax-jsx').default,
		visitor: {
			JSXElement: function(path) {
				const appIdentifier = types.identifier('app');
				const appDeclaration = buildApp(types, appIdentifier);
				const appExpressions = types.react.buildChildren(path.node).map((child) => {
					switch (getElementName(child)) {
						case 'listen':
							return buildListen(types, child, appIdentifier);
						case 'route':
							return buildRoute(types, child, appIdentifier);
						default:
							return buildMiddleware(types, child, appIdentifier);
					}
				});
				path.replaceWithMultiple([ appDeclaration, ...appExpressions ]);
			}
		}
	};
};

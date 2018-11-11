const babel = require('@babel/core');

const buildApp = require('./builders/app');
const buildListen = require('./builders/listen');
const getAttributes = require('./utils/get-attributes');
const getElementName = require('./utils/get-element-name');

const getMiddlewareForNode = (t, node) => {
	if (node.children.length) {
		// Find the middleware passed as a function child
		const { expression } = node.children.find((child) => {
			return child.type === 'JSXExpressionContainer';
		});
		return expression;
	} else {
		// Find the middleware passed via middleware prop
		const middle = node.openingElement.attributes.find((attr) => {
			return attr.name.name === 'middleware';
		}).value.expression;

		return middle;
	}
};

const buildRouteCallExpression = (t, node) => {
	// Build out call expresion for app.route()
	const appIdentifier = t.identifier('app');
	const routeIdentifier = t.identifier('route');
	const memberExpression = t.memberExpression(appIdentifier, routeIdentifier);
	const { path } = getAttributes(t, node);
	const callExpressionForRoute = t.callExpression(memberExpression, [ t.stringLiteral(path) ]);

	// Build out the call expressions
	// for nested get, post, put, etc.
	let lastCallExpression = callExpressionForRoute;
	const children = t.react.buildChildren(node);
	if (children.length) {
		children.forEach((child) => {
			const childName = getElementName(child);
			const childIdentifier = t.identifier(childName);
			const middleware = getMiddlewareForNode(t, child);
			// Chain call + member expressions here since each nested JSX element
			// is a chained call expression on the last call expression
			// e.g.
			// app.route() -> app.route.get()
			// app.route.get() -> app.route().get().post()
			const currentMemberExpression = t.memberExpression(lastCallExpression, childIdentifier);
			// return the expression for the next iteration
			lastCallExpression = t.callExpression(currentMemberExpression, [ middleware ]);
		});
	}
	return lastCallExpression;
};

const buildMiddlewareExpression = (t, node) => {
	const appIdentifier = t.identifier('app');
	const middlewareIdentifier = t.identifier(getElementName(node));
	const { path } = getAttributes(t, node);
	const middleware = getMiddlewareForNode(t, node);
	const memberExpression = t.memberExpression(appIdentifier, middlewareIdentifier);
	return t.callExpression(memberExpression, [ t.stringLiteral(path), middleware ]);
};

const expressJsx = function({ types: t }) {
	return {
		inherits: require('@babel/plugin-syntax-jsx').default,
		visitor: {
			JSXElement: function(path) {
				// Return cases
				if (getElementName(path.node) !== 'app') {
					return;
				}

				const appIdentifier = t.identifier('app');

				// Iterate over app children
				const appExpressions = t.react.buildChildren(path.node).map((child) => {
					const childName = getElementName(child);

					// Build out app.listen();
					if (childName === 'listen') {
						return buildListen(t, child, appIdentifier);
					}

					// Build out app.route()
					if (childName === 'route') {
						const routeCallExpression = buildRouteCallExpression(t, child);
						return routeCallExpression;
					}

					return buildMiddlewareExpression(t, child);
				});

				// Build app declaration
				const appVariableDeclations = buildApp(t, appIdentifier);

				// Replace app
				path.replaceWithMultiple([ appVariableDeclations, ...appExpressions ]);
			}
		}
	};
};

const example = `
const express = require('express');

<app>
  <route path="/resource">
    <get
      middleware={(req, res, next) => {
        res.send(200);
      }}
    />
    <post>
      {(req, res, next) => {
        res.send(200);
      }}
    </post>
  </route>

  <get
    path="/health"
    middleware={(req, res, next) => {
      res.send(200);
    }}
  />

  <get path="/ok">
    {(req, res, next) => {
      res.send(200)
    }}
  </get>

	<listen
		port={8080}
		callback={(req, res) => {
			res.send(200);
		}}
	/>
</app>
`;

const out = babel.transform(example, { plugins: [ expressJsx ] });
console.log(out.code);

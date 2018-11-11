const babel = require('@babel/core');

const buildApp = require('./builders/app');
const buildListen = require('./builders/listen');
const buildMiddleware = require('./builders/middleware');

const getElementAttributes = require('./utils/get-element-attributes');
const getElementName = require('./utils/get-element-name');

const buildRouteCallExpression = (t, node) => {
	// Build out call expresion for app.route()
	const appIdentifier = t.identifier('app');
	const routeIdentifier = t.identifier('route');
	const memberExpression = t.memberExpression(appIdentifier, routeIdentifier);
	const { path } = getElementAttributes(t, node);
	const callExpressionForRoute = t.callExpression(memberExpression, [ t.stringLiteral(path) ]);

	// Build out the call expressions
	// for nested get, post, put, etc.
	let lastCallExpression = callExpressionForRoute;
	const children = t.react.buildChildren(node);
	if (children.length) {
		children.forEach((child) => {
			const childName = getElementName(child);
			const childIdentifier = t.identifier(childName);
			const { callback } = getElementAttributes(t, child);
			// Chain call + member expressions here since each nested JSX element
			// is a chained call expression on the last call expression
			// e.g.
			// app.route() -> app.route.get()
			// app.route.get() -> app.route().get().post()
			const currentMemberExpression = t.memberExpression(lastCallExpression, childIdentifier);
			// return the expression for the next iteration
			lastCallExpression = t.callExpression(currentMemberExpression, [ callback ]);
		});
	}
	return lastCallExpression;
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

					return buildMiddleware(t, child, appIdentifier);
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
      callback={(req, res, next) => {
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
    callback={(req, res, next) => {
      res.send(200);
    }}
  />

  <get path="/ok">
    {(req, res, next) => {
      res.send(200)
    }}
  </get>

	<listen port={8080} />
</app>
`;

const out = babel.transform(example, { plugins: [ expressJsx ] });
console.log(out.code);

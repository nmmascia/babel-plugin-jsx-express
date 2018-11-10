const babel = require('@babel/core');

const getElementName = (node) => {
	return node.openingElement.name.name;
};

const getAttributesAsObj = (node) => {
	if (!node.openingElement.attributes.length) return [];
	return node.openingElement.attributes.reduce((acc, curr) => {
		/*
      If we're looking at a JSXExpressionContainer
      we'll have different node structure than if
      the prop is just a string literal
    */
		const value = curr.value.type === 'JSXExpressionContainer' ? curr.value.expression.value : curr.value.value;

		return Object.assign({}, acc, { [curr.name.name]: value });
	}, {});
};

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

const buildAppInitDeclaration = (t) => {
	const appIdentifier = t.identifier('app');
	const expressIdentifier = t.identifier('express');
	const variableDeclarator = t.variableDeclarator(appIdentifier, t.callExpression(expressIdentifier, []));

	return t.variableDeclaration('const', [ variableDeclarator ]);
};

const buildListenExpression = (t, node) => {
	const appIdentifier = t.identifier('app');
	const listenIdentifier = t.identifier('listen');
	const memberExpression = t.memberExpression(appIdentifier, listenIdentifier);
	const { port } = getAttributesAsObj(node);

	return t.callExpression(memberExpression, [ t.numericLiteral(port) ]);
};

const buildRouteCallExpression = (t, node) => {
	// Build out call expresion for app.route()
	const appIdentifier = t.identifier('app');
	const routeIdentifier = t.identifier('route');
	const memberExpression = t.memberExpression(appIdentifier, routeIdentifier);
	const { path } = getAttributesAsObj(node);
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
	const { path } = getAttributesAsObj(node);
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

				// Iterate over app children
				const appExpressions = t.react.buildChildren(path.node).map((child) => {
					const childName = getElementName(child);

					// Build out app.listen();
					if (childName === 'listen') {
						return buildListenExpression(t, child);
					}

					// Build out app.route()
					if (childName === 'route') {
						const routeCallExpression = buildRouteCallExpression(t, child);
						return routeCallExpression;
					}

					return buildMiddlewareExpression(t, child);
				});

				// Build app declaration
				const appVariableDeclations = buildAppInitDeclaration(t);

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

  <listen port={8080} />
</app>
`;

const out = babel.transform(example, { plugins: [ expressJsx ] });
console.log(out.code);

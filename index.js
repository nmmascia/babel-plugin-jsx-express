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
    const value = curr.value.type === 'JSXExpressionContainer'
      ? curr.value.expression.value
      : curr.value.value;
    return Object.assign({}, acc, { [curr.name.name]: value });
  }, {})
};

const buildNestedRouteDeclaration = (t, node) => {

};

const buildAppInitDeclaration = (t) => {
  const appIdentifier = t.identifier('app');
  const expressIdentifier = t.identifier('express');
  const variableDeclarator = t.variableDeclarator(
    appIdentifier,
    t.callExpression(expressIdentifier, [])
  );

  return t.variableDeclaration('const', [variableDeclarator]);
};

const buildListenExpression = (t, node) => {
  const appIdentifier = t.identifier('app');
  const listenIdentifier = t.identifier('listen');
  const memberExpression = t.memberExpression(appIdentifier, listenIdentifier);
  const { port } = getAttributesAsObj(node);

  return t.callExpression(
    memberExpression,
    [t.numericLiteral(port)]
  );
};

const buildRouteCallExpression = (t, node) => {
  // Build out call expresion for app.route()
  const appIdentifier = t.identifier('app');
  const routeIdentifier = t.identifier('route');
  const memberExpression = t.memberExpression(appIdentifier, routeIdentifier);
  const { route } = getAttributesAsObj(node);
  const callExpressionForRoute = t.callExpression(
    memberExpression,
    [t.stringLiteral(route)]
  );

  // Build out the call expressions
  // for nested get, post, put, etc.
  let lastCallExpression = callExpressionForRoute;
  const children = t.react.buildChildren(node)
  if (children.length) {
    children.forEach((child) => {
      const childName = getElementName(child);
      const childIdentifier = t.identifier(childName);
      // Chain call + member expressions here since each nested JSX element
      // is a chained call expression on the last call expression
      // e.g.
      // app.route() -> app.route.get()
      // app.route.get() -> app.route().get().post()
      const currentMemberExpression = t.memberExpression(lastCallExpression, childIdentifier);
      // return the expression for the next iteration
      lastCallExpression = t.callExpression(currentMemberExpression, []);
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
        });

        // Build app declaration
        const appVariableDeclations = buildAppInitDeclaration(t);

        // Replace app
        path.replaceWithMultiple([
          appVariableDeclations,
          ...appExpressions
        ]);
      }
    }
  }
}

const example = `
const express = require('express');

<app>
  <route route="/resource">
    <get />
    <post />
    <put />
  </route>
  <listen port={8080} />
</app>
`

const out = babel.transform(example, { plugins: [expressJsx] });
console.log(out.code);

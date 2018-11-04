const babel = require('@babel/core');

const getElementName = (node) => {
  return node.openingElement.name.name;
};

const buildAppInitDeclaration = (t) => {
  const appIdentifier = t.identifier('app');
  const expressIdentifier = t.identifier('express');

  return t.variableDeclaration('const', [
    t.variableDeclarator(appIdentifier, t.callExpression(expressIdentifier, []))
  ]);
};

const buildListenExpression = (t, child) => {
  const appIdentifier = t.identifier('app');
  const listenIdentifier = t.identifier('listen');
  const memberExpression = t.memberExpression(appIdentifier, listenIdentifier);

  return t.callExpression(
    memberExpression,
    [t.numericLiteral(8080)]
  );
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

          if (childName === 'listen') {
            return buildListenExpression(t, child);
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
  <listen port={8080} />
</app>
`

const out = babel.transform(example, { plugins: [expressJsx] });
console.log(out.code);

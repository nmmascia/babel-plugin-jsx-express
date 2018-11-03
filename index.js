const babel = require('@babel/core');

const getElementName = (node) => {
  return node.openingElement.name.name;
};

const buildAppInitDeclaration = () => {
  const appIdentifier = t.identifier('app');
  const expressIdentifier = t.indentifier('express');

  return t.variableDeclaration('const', [
    t.variableDeclarator(appIdentifier, t.callExpression(expressIdentifier, []))
  ]);
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

        // Build app declaration
        const appVariableDeclations = buildAppInitDeclaration();

        // Replace app
        path.replaceWithMultiple([
          appVariableDeclations
        ]);
      }
    }
  }
}

const example = `
const express = require('express');

<app>
</app>
`

const out = babel.transform(example, { plugins: [expressJsx] });
console.log(out.code);

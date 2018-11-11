const babel = require('@babel/core');

const buildApp = require('./builders/app');
const buildListen = require('./builders/listen');
const buildMiddleware = require('./builders/middleware');
const buildRoute = require('./builders/route');

const getElementAttributes = require('./utils/get-element-attributes');
const getElementName = require('./utils/get-element-name');

const expressJsx = function({ types }) {
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

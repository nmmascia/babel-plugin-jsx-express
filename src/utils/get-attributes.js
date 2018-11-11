module.exports = (types, node_) => {
  const node = node_.openingElement;

  let attributesFromProps = {};
  if (node.attributes.length) {
    attributesFromProps = node.attributes.reduce((acc, { name: nameNode, value: valueNode }) => {
      const value = types.isJSXExpressionContainer(valueNode)
        ? valueNode.expression.value
        : valueNode.value;

      const name = nameNode.name;

      return Object.assign({}, acc, { [name]: value });
    }, {});
  }

  return Object.assign({}, attributesFromProps);
}

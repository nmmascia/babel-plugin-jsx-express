module.exports = (types, node_) => {
	const node = node_.openingElement;

	let attributesFromProps = {};
	if (node.attributes.length) {
		attributesFromProps = node.attributes.reduce((acc, { name: nameNode, value: valueNode }) => {
			let value;

			if (types.isJSXExpressionContainer(valueNode)) {
				if (types.isLiteral(valueNode.expression)) {
					value = valueNode.expression.value;
				} else {
					value = valueNode.expression;
				}
			} else {
				value = valueNode.value;
			}

			const name = nameNode.name;

			return Object.assign({}, acc, { [name]: value });
		}, {});
	}

	let callbackAttributeFromChildren = {};
	if (node_.children.length) {
		const child = node_.children.find(types.isJSXExpressionContainer);
		if (child) callbackAttributeFromChildren = { callback: child.expression };
	}

	return Object.assign({}, attributesFromProps, callbackAttributeFromChildren);
};

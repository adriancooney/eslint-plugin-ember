'use strict';

const {
  isIdentifier,
  isStringLiteral,
  isProperty,
  isMemberExpression,
  isThisExpression
} = require('../utils/utils');

const {
  parseDependentKeys,
  isComputedDefinition
} = require('../utils/ember');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const rule = {
  meta: {
    docs: {
      description: 'Disallow referencing properties in computeds that aren\'t tracked in it\'s dependant keys',
      category: 'Possible Errors',
      recommended: true,
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/no-get-untracked-props-in-computed.md'
    },
    fixable: null,
  },

  create(context) {
    let computedContext;
    let computedScopeLevel = 0;
    const inComputedScope = () => computedContext && computedScopeLevel === 1;
    const pushScope = () => computedContext && computedScopeLevel++;
    const popScope = () => computedContext && computedScopeLevel--;

    return {
      CallExpression(node) {
        const ancestors = context.getAncestors();
        const parent = ancestors[ancestors.length - 1];

        if (isComputedDefinitionWithDependantKeys(node) && isProperty(parent)) {
          if (computedContext) {
            return;
          }

          computedScopeLevel = 0;
          computedContext = {
            dependantKeys: parseDependentKeys(node),
            referencedKeys: [],
          };
        }

        if (computedContext && inComputedScope() && isPropertyGetterOnThis(node.callee)) {
          const getterKeyNode = node.arguments[0];

          // We only look at string literals, no dynamic keys
          if (!isStringLiteral(getterKeyNode)) {
            return;
          }

          computedContext.referencedKeys.push(getterKeyNode.value);
        }
      },

      'CallExpression:exit': (node) => {
        const ancestors = context.getAncestors();
        const parent = ancestors[ancestors.length - 1];

        if (isComputedDefinitionWithDependantKeys(node) && isProperty(parent) && computedScopeLevel === 0) {
          computedContext.dependantKeys.forEach((dependantKey) => {
            if (!isDependantKeyReferenced(computedContext.referencedKeys, dependantKey)) {
              context.report({
                node,
                message: `Dependant key '${dependantKey}' is not referenced in computed body`
              });
            }
          });

          computedContext = null;
        }
      },

      FunctionExpression: pushScope,
      'FunctionExpression:exit': popScope,

      FunctionDeclaration: pushScope,
      'FunctionDeclaration:exit': popScope,
    };
  }
};

function isComputedDefinitionWithDependantKeys(node) {
  return isComputedDefinition(node) && node.arguments.length >= 2;
}

function isPropertyGetterOnThis(callee) {
  return (
    isMemberExpression(callee) &&
    isThisExpression(callee.object) &&
    isIdentifier(callee.property) &&
    callee.property.name === 'get'
  );
}

function isDependantKeyReferenced(referencedKeys, dependantKey) {
  return referencedKeys.some(referencedKey => {
    const stripped = stripDependantKey(dependantKey);

    return referencedKey.slice(0, stripped.length) === stripped;
  });
}

function explodeProperty(property) {
  return property.split('.').map((node, i, chain) => chain.slice(0, i + 1).join('.'));
}

function stripDependantKey(dependantKey) {
  const split = dependantKey.split(/\.(?:\[\]|@each)/);

  if (split.length > 1) {
    return split[0];
  }

  return dependantKey;
}

module.exports = Object.assign(rule, {
  isDependantKeyReferenced
});

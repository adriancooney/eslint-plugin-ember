'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require('../../../lib/rules/no-unreferenced-dependent-keys');
const RuleTester = require('eslint').RuleTester;

describe('exports', () => {
  describe('isDependantKeyReferenced', () => {
    it('correctly determines if dependant key is referenced', () => {
      expect(rule.isDependantKeyReferenced(['foo', 'bar'], 'bar')).toBe(true);
      expect(rule.isDependantKeyReferenced(['foo'], 'bar')).toBe(false);
      expect(rule.isDependantKeyReferenced(['bar.foo'], 'bar')).toBe(true);
      expect(rule.isDependantKeyReferenced(['bar.foo'], 'bar.[]')).toBe(true);
      expect(rule.isDependantKeyReferenced(['bar[0]'], 'bar.[]')).toBe(true);
      expect(rule.isDependantKeyReferenced(['bar[0].foo'], 'bar.[]')).toBe(true);
      expect(rule.isDependantKeyReferenced(['foo.bar'], 'bar')).toBe(false);
    });
  });
});

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester();
const parserOptions = { ecmaVersion: 6, sourceType: 'module' };
ruleTester.run('no-unreferenced-dependent-keys', rule, {
  valid: [
    {
      code: `
      let obj = {
        foo: Ember.computed('model.foo', 'model.bar', function() {
          this.get('model.foo');
        })
      }
      `,
      parserOptions,
    },
  ],
  invalid: [
  ]
});

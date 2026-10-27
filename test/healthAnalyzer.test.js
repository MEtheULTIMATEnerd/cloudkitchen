const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../utils/healthAnalyzer');

test('local recipe analysis returns a bounded score without external services', () => {
  const result = analyze({
    title: 'Portfolio sample',
    ingredients: ['100g spinach', '100g chicken breast'],
    servings: 2
  });

  assert.equal(result.provider, 'local-fallback+');
  assert.ok(result.healthScore >= 0 && result.healthScore <= 100);
  assert.equal(result.servings, 2);
  assert.ok(result.perServing.kcal > 0);
});

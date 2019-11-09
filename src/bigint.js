// adapted from https://github.com/stems/graphql-bigint
// (parseLiteral modified from official version to fix bug)

/*
MIT License

Copyright (c) 2017 Stem

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const { GraphQLScalarType } = require('graphql');

const MAX_INT = Number.MAX_SAFE_INTEGER;
const MIN_INT = Number.MIN_SAFE_INTEGER;

function coerceBigInt(value) {
  if (value === '') {
    throw new TypeError(
      'BigInt cannot represent non 53-bit signed integer value: (empty string)'
    )
  }
  const num = Number(value)
  if (num !== num || num > MAX_INT || num < MIN_INT) {
    throw new TypeError(
      'BigInt cannot represent non 53-bit signed integer value: ' + String(value)
    )
  }
  const numInt = Math.floor(num);
  if (numInt !== num) {
    throw new TypeError(
      'BigInt cannot represent non-integer value: ' + String(value)
    )
  }
  return numInt;
}

module.exports = new GraphQLScalarType({
  name: 'BigInt',
  description:
    'The `BigInt` scalar type represents non-fractional signed whole numeric ' +
    'values. BigInt can represent values between -(2^53) + 1 and 2^53 - 1. ',
  serialize: coerceBigInt,
  parseValue: coerceBigInt,
  parseLiteral(ast) {
    return coerceBigInt(ast.value);
  }
})

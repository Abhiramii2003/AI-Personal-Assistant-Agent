/**
 * Safe Calculator Tool
 * 
 * Performs arithmetic operations safely WITHOUT using eval().
 * Uses a tokenized recursive-descent parser to calculate mathematical expressions.
 * 
 * Supports:
 * - Basic operators: +, -, *, /, ^ (exponent), % (modulo)
 * - Natural phrases: "20% of 500", "15% of 80"
 * - Parentheses: "(10 + 5) * 4"
 * - Negative and decimal numbers
 */

/**
 * Pre-processes natural language arithmetic expressions
 * e.g., "20% of 500" -> "(20 / 100) * 500"
 * e.g., "25 * 48" -> "25 * 48"
 * e.g., "25 x 48" -> "25 * 48"
 */
function normalizeExpression(expr) {
  if (!expr || typeof expr !== 'string') {
    throw new Error('Invalid calculation input. Input must be a non-empty string.');
  }

  let cleaned = expr.trim();

  // Convert "X% of Y" to "((X / 100) * Y)"
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, '(($1 / 100) * $2)');

  // Convert "X% * Y" or "X * Y%"
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1 / 100)');

  // Replace common multiplication and division symbols
  cleaned = cleaned.replace(/[xX×]/g, '*');
  cleaned = cleaned.replace(/÷/g, '/');

  // Strip leading phrases like "calculate", "what is", "solve", "?", "="
  cleaned = cleaned.replace(/^(what is|calculate|solve|evaluate|compute)\s+/i, '');
  cleaned = cleaned.replace(/[?=\s]+$/g, '');

  return cleaned;
}

/**
 * Tokenizer for arithmetic expressions
 */
function tokenize(expression) {
  const tokens = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/\d/.test(char) || char === '.') {
      let numStr = '';
      let hasDot = false;
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        if (expression[i] === '.') {
          if (hasDot) throw new Error(`Malformed number with multiple decimal points at position ${i}`);
          hasDot = true;
        }
        numStr += expression[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    if ('+-*/^%()'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    throw new Error(`Unsupported character in expression: '${char}'`);
  }

  return tokens;
}

/**
 * Recursive-descent parser to safely evaluate tokens without eval()
 * Grammar:
 * Expression   := Term (( '+' | '-' ) Term)*
 * Term         := Exponent (( '*' | '/' | '%' ) Exponent)*
 * Exponent     := Factor ( '^' Factor )*
 * Factor       := ( '+' | '-' ) Factor | NUMBER | '(' Expression ')'
 */
function parseTokens(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume(expectedValue) {
    const token = tokens[pos];
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    if (expectedValue && token.value !== expectedValue) {
      throw new Error(`Expected '${expectedValue}' but got '${token.value}'`);
    }
    pos++;
    return token;
  }

  function parseExpression() {
    let result = parseTerm();

    while (pos < tokens.length) {
      const token = peek();
      if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
        consume();
        const nextTerm = parseTerm();
        if (token.value === '+') result += nextTerm;
        else result -= nextTerm;
      } else {
        break;
      }
    }

    return result;
  }

  function parseTerm() {
    let result = parseExponent();

    while (pos < tokens.length) {
      const token = peek();
      if (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/' || token.value === '%')) {
        consume();
        const nextExponent = parseExponent();
        if (token.value === '*') {
          result *= nextExponent;
        } else if (token.value === '/') {
          if (nextExponent === 0) {
            throw new Error('Division by zero is not allowed');
          }
          result /= nextExponent;
        } else if (token.value === '%') {
          result %= nextExponent;
        }
      } else {
        break;
      }
    }

    return result;
  }

  function parseExponent() {
    let result = parseFactor();

    while (pos < tokens.length) {
      const token = peek();
      if (token && token.type === 'OPERATOR' && token.value === '^') {
        consume();
        const exponent = parseFactor();
        result = Math.pow(result, exponent);
      } else {
        break;
      }
    }

    return result;
  }

  function parseFactor() {
    const token = peek();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    // Unary plus or minus
    if (token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
      consume();
      const factor = parseFactor();
      return token.value === '-' ? -factor : factor;
    }

    // Number literal
    if (token.type === 'NUMBER') {
      consume();
      return token.value;
    }

    // Parentheses
    if (token.type === 'OPERATOR' && token.value === '(') {
      consume('(');
      const value = parseExpression();
      consume(')');
      return value;
    }

    throw new Error(`Unexpected token '${token.value}'`);
  }

  const finalResult = parseExpression();

  if (pos < tokens.length) {
    throw new Error(`Unexpected extra characters near '${tokens[pos].value}'`);
  }

  return finalResult;
}

/**
 * Main Calculator Execution Function
 * @param {string} input - Mathematical expression e.g. "25 * 48", "20% of 500"
 * @returns {object} { success: boolean, expression: string, result: number|string, formatted: string }
 */
function calculate(input) {
  try {
    const normalized = normalizeExpression(input);
    const tokens = tokenize(normalized);
    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No calculation provided.'
      };
    }

    const numericResult = parseTokens(tokens);

    // Format nicely: limit floating point inaccuracies e.g. 0.1 + 0.2
    const rounded = Number.isInteger(numericResult)
      ? numericResult
      : parseFloat(numericResult.toFixed(8));

    return {
      success: true,
      expression: input,
      normalizedExpression: normalized,
      result: rounded,
      formatted: `${input} = ${rounded}`
    };
  } catch (error) {
    return {
      success: false,
      expression: input,
      error: error.message || 'Calculation error'
    };
  }
}

module.exports = {
  calculate,
  normalizeExpression
};

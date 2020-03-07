import { ASTExpression, ASTIdentifier } from '../ast';

interface ExpressionParser {
    position: number;
    peek(): string;
    match(expected: string): boolean;
    eat(expected?: string): string;
}

function isValidIdentifierStart(char: string): boolean {
    return (
        (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '$' || char === '_'
    );
}

function isValidIdentifier(char: string): boolean {
    return isValidIdentifierStart(char) || (char >= '0' && char <= '9');
}

function createParser(str: string, offset: number = 0): ExpressionParser {
    return {
        position: offset,
        peek() {
            if (this.position > str.length) {
                throw new Error('Unexpected end of expression');
            }

            return str.charAt(this.position);
        },
        match(expected: string) {
            return this.peek() === expected;
        },
        eat(expected?: string): string {
            const actual = this.peek();
            if (expected && actual !== expected) {
                throw new Error(`Expected "${expected}" but found "${actual}"`);
            }

            this.position++;
            return actual;
        },
    };
}

function parseIdentifier(parser: ExpressionParser): ASTIdentifier {
    let buffer = '';

    while (isValidIdentifier(parser.peek())) {
        buffer += parser.eat();
    }

    return {
        type: 'identifier',
        name: buffer,
    };
}

function parse(parser: ExpressionParser): ASTExpression {
    parser.eat('{');

    let expression: ASTExpression = parseIdentifier(parser);

    while (parser.match('.')) {
        parser.eat('.');
        expression = {
            type: 'member-expression',
            object: expression,
            property: parseIdentifier(parser),
        };
    }

    parser.eat('}');

    return expression;
}

export function parseExpression(str: string): ASTExpression {
    const parser = createParser(str);
    const expression = parse(parser);

    if (parser.position !== str.length) {
        throw new Error('Unexpected end of expression');
    }

    return expression;
}

export function parsePartialExpression(
    str: string,
    offset: number
): { expression: ASTExpression; offset: number } {
    const parser = createParser(str, offset);
    const expression = parse(parser);

    return {
        expression,
        offset: parser.position,
    };
}

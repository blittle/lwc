import { ASTRoot, ASTChildNode, ASTText, ASTElement, ASTExpression, ASTAttribute } from '../types';
import { code } from '../utils/code';

import { Block } from './block';

function generateExpression(expression: ASTExpression): string {
    switch (expression.type) {
        case 'identifier':
            return expression.name;

        case 'member-expression':
            return `${generateExpression(expression.object)}.${generateExpression(
                expression.property
            )}`;
    }
}

function generateTextNode(block: Block, parent: string, text: ASTText): void {
    if (typeof text.value === 'string') {
        block.addElement('text', parent, `createText(${JSON.stringify(text.value)});`);
    } else {
        const valueLookup = `context.${generateExpression(text.value)}`;

        const valueIdentifier = block.registerIdentifier(`text_value`, valueLookup);
        const nodeIdentifier = block.addElement('text', parent, `createText(${valueIdentifier});`);

        block.updateStatements.push(code`
            if (${valueIdentifier} !== (${valueIdentifier} = ${valueLookup})) {
                setData(${nodeIdentifier}, ${valueIdentifier});
            }
        `);
    }
}

function generateAttribute(block: Block, parent: string, attribute: ASTAttribute): void {
    if (typeof attribute.value === 'string') {
        block.createStatements.push(
            `setAttribute(${parent}, "${attribute.name}", ${JSON.stringify(attribute.value)})`
        );
    } else {
        block.createStatements.push(
            `setAttribute(${parent}, "${attribute.name}", context.${generateExpression(
                attribute.value
            )});`
        );
        block.updateStatements.push(
            `setAttribute(${parent}, "${attribute.name}", context.${generateExpression(
                attribute.value
            )});`
        );
    }
}

function generateElement(block: Block, parent: string, element: ASTElement): void {
    const identifier = block.addElement(
        element.name,
        parent,
        !element.namespace
            ? `createElement("${element.name}");`
            : `createElement("${element.name}", "${element.namespace}");`
    );

    for (const attribute of element.attributes) {
        generateAttribute(block, identifier, attribute);
    }

    for (const child of element.children) {
        generateChildNode(block, identifier, child);
    }
}

function generateChildNode(block: Block, parent: string, childNode: ASTChildNode): void {
    switch (childNode.type) {
        case 'comment':
            // Do nothing
            break;

        case 'text':
            generateTextNode(block, parent, childNode);
            break;

        case 'element':
            generateElement(block, parent, childNode);
            break;

        default:
            throw new Error('Unexpected child node');
    }
}

export function generateTemplate(root: ASTRoot): string {
    const block = new Block();

    for (const child of root.children) {
        generateChildNode(block, 'target', child);
    }

    return block.render();
}

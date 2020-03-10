import { code } from '../utils/code';
import {
    ASTRoot,
    ASTChildNode,
    ASTText,
    ASTElement,
    ASTExpression,
    ASTAttribute,
    ASTIfBlock,
} from '../types';

import { Block } from './block';
import { Renderer } from './renderer';

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

function generateTextNode(renderer: Renderer, block: Block, parent: string, text: ASTText): void {
    if (typeof text.value === 'string') {
        block.addElement('text', parent, `@createText(${JSON.stringify(text.value)})`);
    } else {
        const valueLookup = `context.${generateExpression(text.value)}`;

        const valueIdentifier = block.registerIdentifier(`text_value`, valueLookup);
        const nodeIdentifier = block.addElement('text', parent, `@createText(${valueIdentifier})`);

        block.updateStatements.push(code`
            if (${valueIdentifier} !== (${valueIdentifier} = ${valueLookup})) {
                @setData(${nodeIdentifier}, ${valueIdentifier});
            }
        `);
    }
}

function generateAttribute(
    renderer: Renderer,
    block: Block,
    parent: string,
    attribute: ASTAttribute
): void {
    if (typeof attribute.value === 'string') {
        block.createStatements.push(
            `@setAttribute(${parent}, "${attribute.name}", ${JSON.stringify(attribute.value)});`
        );
    } else {
        const valueLookup = `context.${generateExpression(attribute.value)}`;

        const valueIdentifier = block.registerIdentifier(`${attribute.name}_value`, valueLookup);

        block.createStatements.push(
            `@setAttribute(${parent}, "${attribute.name}", ${valueIdentifier});`
        );
        block.updateStatements.push(code`
            if (${valueIdentifier} !== (${valueIdentifier} = ${valueLookup})) {
                @setAttribute(${parent}, "${attribute.name}", ${valueIdentifier});
            }
        `);
    }
}

function generateElement(
    renderer: Renderer,
    block: Block,
    parent: string,
    element: ASTElement
): void {
    const identifier = block.addElement(
        element.name,
        parent,
        !element.namespace
            ? `@createElement("${element.name}")`
            : `@createElement("${element.name}", "${element.namespace}")`
    );

    for (const attribute of element.attributes) {
        generateAttribute(renderer, block, identifier, attribute);
    }

    for (const child of element.children) {
        generateChildNode(renderer, block, identifier, child);
    }
}

function generateIfBlock(
    renderer: Renderer,
    block: Block,
    parent: string,
    ifBlockNode: ASTIfBlock
): void {
    const conditionLookup = `context.${generateExpression(ifBlockNode.condition)}`;
    const conditionExpression =
        ifBlockNode.modifier === 'false' ? `!${conditionLookup}` : conditionLookup;

    const ifBlock = renderer.createBlock('ifBlock');
    for (const child of ifBlockNode.children) {
        generateChildNode(renderer, ifBlock, 'target', child);
    }

    const ifBlockIdentifier = block.registerIdentifier(
        'if_block',
        `${conditionExpression} && ${ifBlock.name}(context)`
    );

    block.createStatements.push(code`
        if (${ifBlockIdentifier}) {
            ${ifBlockIdentifier}.create();
        }
    `);
    block.insertStatements.push(code`
        if (${ifBlockIdentifier}) {
            ${ifBlockIdentifier}.insert(${parent});
        }
    `);
    block.updateStatements.push(code`
        if (${conditionExpression}) {
            if (${ifBlockIdentifier}) {
                ${ifBlockIdentifier}.update();
            } else {
                ${ifBlockIdentifier} = ${ifBlock.name}(context);
                ${ifBlockIdentifier}.create();
                ${ifBlockIdentifier}.insert(${parent});
            }
        }
    `);
}

function generateChildNode(
    renderer: Renderer,
    block: Block,
    parent: string,
    childNode: ASTChildNode
): void {
    switch (childNode.type) {
        case 'comment':
            // Do nothing
            break;

        case 'text':
            generateTextNode(renderer, block, parent, childNode);
            break;

        case 'element':
            generateElement(renderer, block, parent, childNode);
            break;

        case 'if-block':
            generateIfBlock(renderer, block, parent, childNode);
            break;

        default:
            throw new Error('Unexpected child node');
    }
}

export function generateTemplate(root: ASTRoot): string {
    const renderer = new Renderer();
    const block = renderer.createBlock('template', { isRoot: true });

    for (const child of root.children) {
        generateChildNode(renderer, block, 'target', child);
    }

    return renderer.render();
}

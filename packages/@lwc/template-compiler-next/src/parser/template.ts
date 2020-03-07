import * as parse5 from 'parse5';
import {
    ASTExpression,
    ASTText,
    ASTComment,
    ASTAttribute,
    ASTRoot,
    ASTChildNode,
} from '../ast';

import * as parse5Utils from './parse5-utils';
import { parseExpression } from './expression';

function parseTextNode(textNode: parse5.TextNode): ASTText[] {
    const astNodes: ASTText[] = [];

    let position = 0;
    let buffer = '';

    while (position < textNode.value.length) {
        let char = textNode.value.charAt(position);

        if (char === '{') {
            if (buffer.length > 0) {
                astNodes.push({
                    type: 'text',
                    value: buffer,
                });
                buffer = '';
            }

            while (char !== '}') {
                char = textNode.value.charAt(position);

                if (position >= textNode.value.length) {
                    throw new Error('Unexpected end of expression');
                }

                buffer += char;
                position++;
            }

            astNodes.push({
                type: 'text',
                value: parseExpression(buffer),
            });

            buffer = '';
            char = textNode.value.charAt(position++);
        }

        buffer += char;
        position++;
    }

    if (buffer.length > 0) {
        astNodes.push({
            type: 'text',
            value: buffer,
        });
    }

    return astNodes;
}

function parseComment(commentNode: parse5.CommentNode): ASTComment {
    return {
        type: 'comment',
        value: commentNode.data,
    };
}

function getIfAttribute({
    attrs,
}: parse5.Element): { modifier: 'true' | 'false'; condition: ASTExpression } | null {
    const ifAttribute = attrs.find(attr => attr.name.startsWith('if:'));
    if (!ifAttribute) {
        return null;
    }

    attrs.splice(attrs.indexOf(ifAttribute), 1);

    const modifierMatch = ifAttribute.name.match(/^if:(.*)$/);
    if (!modifierMatch) {
        throw new Error('Invalid if directive');
    }

    const modifier = modifierMatch[1];
    if (modifier !== 'true' && modifier !== 'false') {
        throw new Error(`Invalid if modifier ${modifier}`);
    }

    return {
        modifier,
        condition: parseExpression(ifAttribute.value),
    };
}

function getForAttribute({
    attrs,
}: parse5.Element): { expression: ASTExpression; item?: string; index?: string } | null {
    const forEachAttribute = attrs.find(attr => attr.name.startsWith('for:each'));
    if (!forEachAttribute) {
        return null;
    }

    attrs.splice(attrs.indexOf(forEachAttribute), 1);

    const forItemAttribute = attrs.find(attr => attr.name.startsWith('for:item'));
    if (forItemAttribute) {
        attrs.splice(attrs.indexOf(forItemAttribute), 1);
    }

    const forIndexAttribute = attrs.find(attr => attr.name.startsWith('for:item'));
    if (forIndexAttribute) {
        attrs.splice(attrs.indexOf(forIndexAttribute), 1);
    }

    return {
        expression: parseExpression(forEachAttribute.value),
        item: forItemAttribute?.value,
        index: forIndexAttribute?.value,
    };
}

function parseAttributes(attribute: parse5.Attribute): ASTAttribute {
    return {
        type: 'attribute',
        name: attribute.name,
        value: attribute.value,
    };
}

function parseElement(node: parse5.Element): ASTChildNode {
    const forAttribute = getForAttribute(node);
    const ifAttribute = getIfAttribute(node);

    let element: ASTChildNode = {
        type: 'element',
        name: node.tagName,
        namespace: node.namespaceURI,
        attributes: node.attrs.map(parseAttributes),
        children: node.childNodes.flatMap(parseNode),
    };

    if (ifAttribute) {
        element = {
            type: 'if-block',
            modifier: ifAttribute.modifier,
            condition: ifAttribute.condition,
            children: [element],
        };
    }

    if (forAttribute) {
        element = {
            type: 'for-block',
            expression: forAttribute.expression,
            item: forAttribute.item,
            index: forAttribute.index,
            children: [element],
        };
    }

    return element;
}

function parseNode(node: parse5.Node): ASTChildNode[] {
    if (parse5Utils.isTextNode(node)) {
        return parseTextNode(node);
    } else if (parse5Utils.isCommentNode(node)) {
        return [parseComment(node)];
    } else if (parse5Utils.isElement(node)) {
        return [parseElement(node)];
    }

    throw new Error(`Unexpected node "${node}"`);
}

export function parseTemplate(src: string): ASTRoot {
    const fragment = parse5.parseFragment(src);

    const rootElements = fragment.childNodes.filter(parse5Utils.isElement);
    if (rootElements.length === 0) {
        throw new Error('No <template> tag found.');
    } else if (rootElements.length > 1) {
        throw new Error('Multiple root elements found in the template');
    }

    const [rootTemplate] = rootElements;
    if (!parse5Utils.isTemplate(rootTemplate)) {
        throw new Error('Unexpected element at the root');
    }

    const children = rootTemplate.content.childNodes.flatMap(parseNode);

    return {
        type: 'root',
        children,
    };
}

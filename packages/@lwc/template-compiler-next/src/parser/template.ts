import * as parse5 from 'parse5';
import {
    ASTExpression,
    ASTText,
    ASTComment,
    ASTAttribute,
    ASTRoot,
    ASTChildNode,
    ASTIdentifier,
    CompilerConfig,
} from '../types';

import * as parse5Utils from '../utils/parse5';
import { HTML_NAMESPACE } from '../utils/namespaces';

import { parseExpression, parseExpressionAt, parseIdentifer } from './expression';

function parseTextNode(textNode: parse5.TextNode, config: CompilerConfig): ASTText[] {
    const { value: str } = textNode;
    const astNodes: ASTText[] = [];

    let position = 0;
    while (position < str.length) {
        if (!config.preserveWhitespaces) {
            while (position < str.length && str.charAt(position).match(/[\n\t\s]/)) {
                position++;
            }
        }

        const textStart = position;
        while (position < str.length && str.charAt(position) !== '{') {
            position++;
        }

        if (textStart !== position) {
            astNodes.push({
                type: 'text',
                value: str.slice(textStart, position),
            });
        }

        if (str.charAt(position) === '{') {
            const { expression, offset } = parseExpressionAt(str, position);

            position = offset;
            astNodes.push({
                type: 'text',
                value: expression,
            });
        }
    }

    return astNodes;
}

function parseComment(commentNode: parse5.CommentNode): ASTComment {
    return {
        type: 'comment',
        value: commentNode.data,
    };
}

function consumeIfAttribute({
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

function consumeForAttribute({
    attrs,
}: parse5.Element): {
    expression: ASTExpression;
    item?: ASTIdentifier;
    index?: ASTIdentifier;
} | null {
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
        item: forItemAttribute ? parseIdentifer(forItemAttribute.value) : undefined,
        index: forIndexAttribute ? parseIdentifer(forIndexAttribute.value) : undefined,
    };
}

function parseAttributes(attribute: parse5.Attribute): ASTAttribute {
    const value = attribute.value.startsWith('{')
        ? parseExpression(attribute.value)
        : attribute.value;

    return {
        type: 'attribute',
        name: attribute.name,
        value,
    };
}

function parseElement(node: parse5.Element, config: CompilerConfig): ASTChildNode {
    const forAttribute = consumeForAttribute(node);
    const ifAttribute = consumeIfAttribute(node);

    let element: ASTChildNode = {
        type: 'element',
        name: node.tagName,
        namespace: HTML_NAMESPACE !== node.namespaceURI ? node.namespaceURI : undefined,
        attributes: node.attrs.map(parseAttributes),
        children: node.childNodes.flatMap(child => parseChildNode(child, config)),
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

function parseChildNode(node: parse5.Node, config: CompilerConfig): ASTChildNode[] {
    if (parse5Utils.isTextNode(node)) {
        return parseTextNode(node, config);
    } else if (parse5Utils.isCommentNode(node)) {
        return [parseComment(node)];
    } else if (parse5Utils.isElement(node)) {
        return [parseElement(node, config)];
    }

    throw new Error(`Unexpected node "${node}"`);
}

export function parseTemplate(src: string, config: CompilerConfig): ASTRoot {
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

    const children = rootTemplate.content.childNodes.flatMap(child =>
        parseChildNode(child, config)
    );

    return {
        type: 'root',
        children,
    };
}

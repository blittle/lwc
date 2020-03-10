import { code } from '../utils/code';
import { Block } from './block';

export class Renderer {
    blocks: Block[] = [];

    createBlock(name: string, options?: { isRoot: boolean }) {
        const original = name;

        let suffix = 0;
        while (this.blocks.some(block => block.name === name)) {
            name = `${original}${suffix++}`;
        }

        const block = new Block(name, {
            isRoot: options?.isRoot ?? false,
        });
        this.blocks.push(block);

        return block;
    }

    render() {
        let result = Array.from(this.blocks.values())
            .map(block => block.render())
            .join('\n\n');

        const runtimeHelpers: Set<string> = new Set();
        result = result.replace(/@(\w+)\(/g, (_, helper) => {
            runtimeHelpers.add(helper);
            return `${helper}(`;
        });

        if (runtimeHelpers.size) {
            result = code`
                import { renderer } from 'lwc';
                const { ${Array.from(runtimeHelpers).join(', ')} } = renderer;

                ${result}
            `;
        }

        return result;
    }
}

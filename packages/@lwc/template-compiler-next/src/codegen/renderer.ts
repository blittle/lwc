import { Block } from './block';

export class Renderer {
    blocks: Block[] = [];

    createBlock(name: string) {
        const original = name;

        let suffix = 0;
        while (this.blocks.some(block => block.name === name)) {
            name = `${original}${suffix++}`;
        }

        const block = new Block(name);
        this.blocks.push(block);

        return block;
    }

    render() {
        return Array.from(this.blocks.values())
            .map(block => block.render())
            .join('\n\n');
    }
}

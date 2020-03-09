import { parseTemplate } from './parser/template';
import { generateTemplate } from './codegen/template';

import { CompilerConfig } from './types';

export function compile(str: string, config: CompilerConfig = {}): { code: string; ast: any } {
    const root = parseTemplate(str, config);
    const code = generateTemplate(root);

    return {
        code,
        ast: root,
    };
}

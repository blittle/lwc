import { parseTemplate } from './parser/template';
import { generateTemplate } from './codegen/template';

import { CompilerConfig } from './types';

export function compile(str: string, config: CompilerConfig = {}): string {
    const root = parseTemplate(str, config);
    return generateTemplate(root);
}

function template(context) {
    let if_block = context.isTrue && ifBlock(ctx);
    return {
        create() {
            if (if_block) {
                if_block.create();
            }
        },
        insert(target) {
            if (if_block) {
                if_block.insert(target);
            }
        },
        update() {
            if (context.isTrue) {
                if (if_block) {
                    if_block.update();
                } else {
                    if_block = ifBlock(ctx);
                    if_block.create();
                    if_block.insert(target);
                }
            }
        }
    }
}

function ifBlock(context) {
    let div;
    let text;
    return {
        create() {
            div = createElement("div");
            text = createText("test\n    ");
        },
        insert(target) {
            insert(div, target);
            insert(text, div);
        },
        update() {
            
        }
    }
}
function template(context) {
    let text;
    return {
        create() {
            text = createText("Hello world!\n");
        },
        insert(target) {
            insert(text, target);
        },
        update() {
            
        }
    }
}
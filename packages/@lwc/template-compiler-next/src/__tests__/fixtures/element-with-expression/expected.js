import { renderer } from 'lwc';
const { createElement, createText, setData } = renderer;

export default function template(context) {
    let span;
    let text;
    let text_value = context.name;
    let text0;
    let text1;
    return {
        create() {
            span = createElement("span");
            text = createText("Hello ");
            text0 = createText(text_value);
            text1 = createText("!");
        },
        insert(target) {
            insert(span, target);
            insert(text, span);
            insert(text0, span);
            insert(text1, span);
        },
        update() {
            if (text_value !== (text_value = context.name)) {
                setData(text0, text_value);
            }
        }
    }
}
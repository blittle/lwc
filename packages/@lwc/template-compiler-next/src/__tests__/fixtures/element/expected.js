import { renderer } from 'lwc';
const { createElement, createText } = renderer;

export default function template(context) {
    let span;
    let text;
    return {
        create() {
            span = createElement("span");
            text = createText("test");
        },
        insert(target) {
            insert(span, target);
            insert(text, span);
        },
        update() {
            
        }
    }
}
const { compile } = require('./dist/commonjs/index');

compile(`
<template>
    Hello {name.bar.baz} awd ad {bar}!
</template>
`);

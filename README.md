**Proprima** is a high performance, standard
parser for the [Proto language](https://github.com/Nathan-Wall/proto) written in ECMAScript (also popularly known as
[JavaScript](http://en.wikipedia.org/wiki/JavaScript>JavaScript)).
Proprima is created and maintained by Nathan Wall.
It is derived from [Esprima](https://github.com/ariya/esprima) by [Ariya Hidayat](http://twitter.com/ariyahidayat)
and [many contributors](https://github.com/ariya/esprima/contributors).

### Features

- Parser for the Proto programming language
- Sensible [syntax tree format](http://esprima.org/doc/index.html#ast) based on with Mozilla
[Parser AST](https://developer.mozilla.org/en/SpiderMonkey/Parser_API)
- Optional tracking of syntax node location (index-based and line-column)

Proprima can serve as a **building block** for some Proto
language tools, from code instrumentation
to editor autocompletion.

Proprima runs on many popular web browsers, as well as other ECMAScript platforms such as
[Node.js](https://npmjs.org/package/esprima) and [Rhino](http://www.mozilla.org/rhino).

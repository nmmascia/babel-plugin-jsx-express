# babel-plugin-jsx-express

Babel plugin to write express applications using jsx.

# Table of Contents

* [Installation](#installation)
* [Example](#example)

## Installation

1. npm install package
  ```bash
  npm install @nmmascia/babel-plugin-jsx-express --save-dev
  ```
2. Add to your `.babelrc`
  ```
  {
    "plugins": ["@nmmascia/jsx-express"]
  }
  ```

## Example

Before:

```jsx
const express = require('express');

<app>
  <get
    path="/hello-world"
    callback={(req, res) => {
      res.send('<p>Hello World!</p>');
    }}
  />
  <listen
    port={8080}
    callback={(err) => {
      if (!err) console.log('started!');
    }}
  />
</app>
```

After:
```js
const express = require('express');

const app = express();
app.get("/hello-world", (req, res) => {
  res.send('<p>Hello World!</p>');
})
app.listen(8080, err => {
  if (!err) console.log('started!');
})
```

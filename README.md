# @buccaneerai/PACKAGE_NAME
> DESCRIPTION

FIXME - TODOS
- Replace all instances of `"PACKAGE_NAME"` (in this repository) with the name of your package
- Replace all instances of DESCRIPTION with your descrition of the package.
- Look for the items that say FIXME and fix them.  There are only a couple.

## Installation
This is a private package. It requires setting up access in your npm config.

```bash
yarn add @buccaneerai/PACKAGE_NAME
```

## API

FIXME - write some docs so other devs know how the public API works.
### `myFunc`
```js
import {from} from 'rxjs';
import {myFunction} from '@buccaneerai/PACKAGE_NAME';

const string$ = from(['foo', 'bar']);
const output$ = string$.pipe(myFunction());
output$.subscribe(console.log); 
// Output:
// foo
// bar
```

## Contributing, Deployments, etc.
See [CONTRIBUTING.md](https://github.com/buccaneerai/PACKAGE_NAME/blob/master/docs/CONTRIBUTING.md) file for information about deployments, etc.

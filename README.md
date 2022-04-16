# @buccaneerai/stt-ibm
> 👂 An RxJS operator for real-time speech-to-text (STT/S2T) streaming using the IBM Watson.

## Installation
This is a private package. It requires setting up access in your npm config.

```bash
yarn add @buccaneerai/stt-ibm
```

## Demo
To run the demo pipeline:
```bash
yarn demo:run <myInstanceId> --secret <secretAccessKey> --write-output
```

## API

### `toIBM`
```js
import {from} from 'rxjs';
import {myFunction} from '@buccaneerai/stt-ibm';
import {fromFile} from '@bottlenose/rxfs';

const filePath = 'path/to/audio-file.linear16';
// For a full list of options, see ./src/lib/toIBM.js
const params = {
  secretAccessKey: process.env.IBM_SECRET_ACCESS_KEY,
  instanceId: process.env.IBM_STT_INSTANCE_ID,
  region: 'us-east',
};
const audioChunk$ = fromFile(filePath);
const output$ = string$.pipe(toIBM(params));
output$.subscribe(console.log); 
// Output:
// {...resultFromIBMWatson}
// {...anotherResultFromIBMWatson}
output$.error$.subscribe(console.error); // optional: handle Websocket Errors
```

## Contributing, Deployments, etc.
See [CONTRIBUTING.md](https://github.com/buccaneerai/stt-ibm/blob/master/docs/CONTRIBUTING.md) file for information about deployments, etc.

## References
- [IBM Speech-to-text docs](https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-websockets)

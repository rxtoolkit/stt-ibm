import {concat,of,throwError} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {conduit} from '@bottlenose/rxws';

import shortenChunks from '../internals/shortenChunks.js';

const errors = {
  missingCredentials: () => new Error('toAWS operator requires AWS credentials'),
};

// https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-websockets
export const getUrl = ({
  region,
  instanceId,
  secret,
  model = 'en-US_Multimedia',
  optOutLearning = true,
  acousticCustomizationId = null,
  baseModelVersion = null,
}) => (
  'wss://'
  + `api.${region}.speech-to-text.watson.cloud.ibm.com/instances/${instanceId}`
  + '/v1/recognize'
  + `?access_token=${secret}`
  + `&x-watson-learning-opt-out=${optOutLearning}`
  + (model ? `&model=${model}` : '') // en-US_AllisonV3Voice
  + (acousticCustomizationId ? `&acoustic_customization_id=${acousticCustomizationId}` : '')
  + (baseModelVersion ? `&base_model_version=${baseModelVersion}` : '')
);

const serializer = data => data;

const deserializer = data => data;

export const createInitialMessage = ({
  contentType,
  interimResults,
  inactivityTimeout,
  maxAlternatives,
  useSmartFormatting,
  useSpeakerLabels,
  useWordConfidence = true,
}) => ({
  action: 'start',
  'content-type': contentType,
  'interim_results': interimResults,
  'inactivity_timeout': inactivityTimeout,
  'max_alternatives': 3,
  'smart_formatting': useSmartFormatting,
  'speaker_labels': useSpeakerLabels,
  'word_confidence': useWordConfidence,
});

const createDoneMessage = () => ({action: 'stop'});

const toIBM = function toIBM({
  instanceId,
  secretAccessKey,
  region = (process.env.IBM_REGION || 'us-east'),
  optOutLearning = true,
  model = 'en-US_Multimedia',
  acousticCustomizationId = null,
  baseModelVersion = null,
  stop$ = of(),
  contentType = 'audio/l16',
  interimResults = true,
  inactivityTimeout = 60,
  maxAlternatives = 3,
  smartFormatting = true,
  speakerLabels = true,
  useWordConfidence = true,
  chunkSize = 512,
  _conduit = conduit,
  _shortenChunks = shortenChunks,
  _getUrl = getUrl,
  _serializer = serializer,
  _deserializer = deserializer,
} = {}) {
  // audio data should already be encoded as 16-bit PCM
  // with a sample rate of 16000 stored in a Buffer...
  return fileChunk$ => {
    if (!secretAccessKey) return throwError(errors.missingCredentials());
    const url = getUrl({
      region,
      instanceId,
      secretAccessKey,
      voice,
      optOutLogging,
      acousticCustomizationId,
      baseModelVersion
    });
    const initialMessage$ = of(createInitialMessage({
      contentType,
      interimResults,
      inactivityTimeout,
      maxAlternatives,
      useSmartFormatting,
      useSpeakerLabels,
      useWordConfidence
    }));
    const throttledChunk$ = fileChunk$.pipe(_shortenChunks(chunkSize));
    const doneMessage$ = of(createDoneMessage());
    const websocketMessage = concat(
      initialMessage$,
      throttledChunk$,
      doneMessage$
    );
    const message$ = websocketMessage$.pipe(
       // Keep chunks reasonably small
      // stream chunks to IBM websocket server and receive responses
      _conduit({url, serializer: _serializer, deserializer: _deserializer}),
      takeUntil(stop$)
    );
    return message$;
  };
};

export default toIBM;

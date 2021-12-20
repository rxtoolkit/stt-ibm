import get from 'lodash/get';
import axios from 'axios';
import qs from 'qs';
import {concat,from,merge,of,Subject,throwError} from 'rxjs';
import {delay,filter,mergeMap,share,take,takeUntil,tap} from 'rxjs/operators';
import {conduit} from '@buccaneerai/rxjs-ws';

import shortenChunks from '../internals/shortenChunks.js';

const errors = {
  missingCredentials: () => new Error('toIBM operator requires IBM Watson credentials'),
  missingInstanceId: () => new Error('toIBM operator requires IBM Watson credentials'),
  authenticationError: () => new Error('toIBM operator failed to authenticate'),
  invalidConfig: () => new Error('toIBM operator could not parse options into JSON'),
};

// https://cloud.ibm.com/docs/account?topic=account-iamtoken_from_apikey
export const getTokenFromApiKey = (apiKey, _axios = axios, _qs = qs) => {
  const response$ = from(
    _axios({
      url: 'https://iam.cloud.ibm.com/identity/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      data: _qs.stringify({
        apikey: apiKey,
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
      }),
    })
  );
  const token$ = response$.pipe(
    mergeMap(res =>
      get(res, 'data.access_token', null)
      ? of(get(res, 'data.access_token', null))
      : throwError(errors.authenticationError())
    )
  );
  return token$;
};


// https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-websockets
export const getUrl = ({
  region,
  instanceId,
  token,
  model = 'en-US_Multimedia',
  optOutLearning = false,
  acousticCustomizationId = null,
  baseModelVersion = null,
}) => (
  'wss://'
  + `api.${region}.speech-to-text.watson.cloud.ibm.com/instances/${instanceId}`
  + '/v1/recognize'
  + `?access_token=${token}`
  + `&x-watson-learning-opt-out=${optOutLearning}`
  + (model ? `&model=${model}` : '') // en-US_AllisonV3Voice
  + (acousticCustomizationId ? `&acoustic_customization_id=${acousticCustomizationId}` : '')
  + (baseModelVersion ? `&base_model_version=${baseModelVersion}` : '')
);

const serializer = data => data;

const deserializer = data => data;

export const createInitialMessage = ({
  contentType,
  sampleRate,
  interimResults,
  inactivityTimeout,
  maxAlternatives,
  useSmartFormatting,
  useSpeakerLabels,
  useWordConfidence = true,
}) => JSON.stringify({
  action: 'start',
  'content-type': `${contentType};rate=${sampleRate}`,
  'interim_results': interimResults,
  'inactivity_timeout': inactivityTimeout,
  'max_alternatives': 3,
  'smart_formatting': useSmartFormatting,
  'speaker_labels': useSpeakerLabels,
  'word_confidence': useWordConfidence,
});

const createDoneMessage = () => JSON.stringify({action: 'stop'});

const toIBM = function toIBM({
  instanceId,
  secretAccessKey,
  region = (process.env.IBM_REGION || 'us-east'),
  optOutLearning = true,
  model = 'en-US_BroadbandModel', // 'en-US_Multimedia',
  acousticCustomizationId = null,
  baseModelVersion = null,
  stop$ = of(),
  contentType = 'audio/l16',
  sampleRate = 16000,
  interimResults = true,
  inactivityTimeout = 60,
  maxAlternatives = 3,
  useSmartFormatting = true,
  useSpeakerLabels = true,
  useWordConfidence = true,
  chunkSize = 512,
  useShortenedChunks = false,
  _conduitOptions = {},
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
    if (!instanceId) return throwError(errors.missingInstanceId());
    const token$ = getTokenFromApiKey(secretAccessKey);
    let initialMessage$, doneMessage$, err$;
    try {
      initialMessage$ = of(createInitialMessage({
        contentType,
        sampleRate,
        interimResults,
        inactivityTimeout,
        maxAlternatives,
        useSmartFormatting,
        useSpeakerLabels,
        useWordConfidence
      }));
      doneMessage$ = of(createDoneMessage());
    } catch {
      err$ = throwError(errors.invalidConfig());
    }
    if (err$) return err$;
    const ibmReadyToReceive$ = new Subject();
    const throttledChunk$ = fileChunk$.pipe(
      useShortenedChunks ? _shortenChunks(chunkSize) : tap(),
      // delay binary messages until IBM confirms that it is ready to
      // receive the stream
      delay(ibmReadyToReceive$)
    );
    const websocketMessage$ = concat(
      initialMessage$,
      throttledChunk$,
      doneMessage$
    );
    const message$ = token$.pipe(
      mergeMap(token => {
        const url = getUrl({
          region,
          instanceId,
          token,
          optOutLearning,
          model,
          acousticCustomizationId,
          baseModelVersion
        });
        return websocketMessage$.pipe(
          // Keep chunks reasonably small
          // stream chunks to IBM websocket server and receive responses
          _conduit({
            url,
            serializer: _serializer,
            deserializer: _deserializer,
            ..._conduitOptions
          })
        );
      }),
      takeUntil(stop$),
      share()
    );
    const ibmReady$ = message$.pipe(
      take(1),
      tap(() => ibmReadyToReceive$.next(true)),
      filter(() => false)
    );
    return merge(ibmReady$, message$);
  };
};

export default toIBM;

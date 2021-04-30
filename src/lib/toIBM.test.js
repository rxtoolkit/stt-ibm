import {expect} from 'chai';
// import sinon from 'sinon';
// import {marbles} from 'rxjs-marbles/mocha';

import toIBM, {getUrl, createInitialMessage} from './toIBM';

describe('toIBM', () => {
  it('should export a function', () => {
    expect(toIBM).to.be.a('function');
  });

  it('.getUrl should generate correct IBM endpoint with basic options', () => {
    const params = {
      region: 'us-east',
      instanceId: 'abcdefg',
      token: 'secret',
      model: 'en-US_Multimedia',
    };
    const actual = getUrl(params);
    const expected = 'wss://'
     + 'api.us-east.speech-to-text.watson.cloud.ibm.com/instances/abcdefg'
     + '/v1/recognize'
     + '?access_token=secret'
     + '&x-watson-learning-opt-out=true'
     + '&model=en-US_Multimedia';
    expect(expected).to.equal(expected);
  });

  it('.createInitialMessage should generate correct startup message', () => {
    const params = {
      contentType: 'audio/l16',
      interimResults: true,
      inactivityTimeout: 60,
      maxAlternatives: 3,
      useSmartFormatting: true,
      useSpeakerLabels: true,
      useWordConfidence: true,
    };
    const actual = createInitialMessage(params);
    const expected = {
      action: 'start',
      'content-type': 'audio/l16',
      'interim_results': true,
      'inactivity_timeout': 60,
      'max_alternatives': 3,
      'smart_formatting': true,
      'speaker_labels': true,
      'word_confidence': true,
    };
    expect(actual).to.deep.equal(expected);
  });
});

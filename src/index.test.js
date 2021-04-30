import {expect} from 'chai';

import * as api from './index';

describe('index', () => {
  it('should export public API', () => {
    expect(Object.keys(api)).to.deep.equal([
      'toIBM',
    ]);
  });
});

const { assert, expect } = require('chai');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

const compileTasksAndTargets = rewire('../../../src/lib/compilation/compile-tasks-and-targets');

const genMocks = () => ({
  fs: {
    exists: sinon.stub(),
    read: sinon.stub(),
  },
  pack: sinon.stub().returns('code'),
});

describe('compile tasks and targets', () => {
  it('use minified legacy rules when present', () => {
    const mocks = genMocks();
    mocks.fs.exists
      .withArgs('/project/rules.nools.js').returns(true);
    mocks.fs.read
      .withArgs('/project/rules.nools.js').returns(`define Target {
        _id: null
      }
      
      define Contact {
        contact: null,
        reports: null
      }

      rule GenerateEvents {
        when {
          c: Contact
        }
        then {
          var now = Utils.now();
          var today = new Date();
        }
      }`);
    
    return compileTasksAndTargets
      .__with__(mocks)(() => compileTasksAndTargets('/project', { minifyScripts: true }))
      .then(actual => {
        expect(actual).to.deep.eq({
          rules: 'define Target {_id: null}define Contact {contact: null,reports: null}rule '
            + 'GenerateEvents {when {c: Contact}then {var now = Utils.now();var today = new Date();}}',
        });
        expect(mocks.pack.callCount).to.eq(0);
      });
  });

  it('legacy + declarative files yields exception', () => {
    const mocks = genMocks();
    mocks.fs.exists
      .withArgs('/rules.nools.js').returns(true)
      .withArgs('/targets.js').returns(true);
    mocks.fs.read.withArgs('/rules.nools.js').returns('define Target {_id: null}');
    
    return compileTasksAndTargets.__with__(mocks)(() => compileTasksAndTargets('/'))
      .then(() => assert.fail('Expected compilation error'))
      .catch(err => {
        expect(err.message).to.include('Both legacy and declarative');
      });
  });

  it('package and use declarative files', () => {
    const expectedProjectPath = '/project';
    const options = {};
    const mocks = genMocks();
    mocks.fs.exists
      .withArgs('/project/rules.nools.js').returns(false)
      .withArgs('/project/targets.js').returns(true)
      .withArgs('/project/tasks.js').returns(true);

    return compileTasksAndTargets
      .__with__(mocks)(() => compileTasksAndTargets(expectedProjectPath, options))
      .then(({ rules: actualCode }) => {
        expect(actualCode).to.eq('code');
        expect(mocks.pack.callCount).to.eq(1);

        const [actualProjectPath, actualEntryPath, actualLintPath, actualOptions] = mocks.pack.args[0];
        expect(actualProjectPath).to.eq(expectedProjectPath);
        expect(path.basename(actualEntryPath)).to.eq('lib.js');
        expect(fs.existsSync(actualEntryPath)).to.eq(true);

        expect(path.basename(actualLintPath)).to.eq('.eslintrc');
        expect(fs.existsSync(actualLintPath)).to.eq(true);

        expect(actualOptions).to.eq(options);
      });
  });

  it('missing declarative file yields exception', () => {
    const mocks = genMocks();
    mocks.fs.exists
      .withArgs('/rules.nools.js').returns(false)
      .withArgs('/targets.js').returns(true);
    mocks.fs.read.withArgs('/rules.nools.js').returns('');
    
    return compileTasksAndTargets.__with__(mocks)(() => compileTasksAndTargets('/'))
      .then(() => assert.fail('Expected compilation error'))
      .catch(err => {
        expect(err.message).to.include('tasks.js');
      });
  });
});

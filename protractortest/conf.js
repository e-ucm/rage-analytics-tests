// conf.js
exports.config = {
  framework: 'jasmine',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  allScriptsTimeout: 60000,
  specs: ['spec.js'],
  capabilities: {
    browserName: 'chrome',
    count: 1
  }
}

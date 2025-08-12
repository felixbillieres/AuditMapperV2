'use strict';

var globals = require('@jest/globals');
var matchers = require('./matchers-c62c6547.js');
require('redent');
require('@adobe/css-tools');
require('dom-accessibility-api');
require('aria-query');
require('picocolors');
require('lodash/isEqualWith.js');
require('css.escape');

/* istanbul ignore file */


globals.expect.extend(matchers.extensions);

var JobQ =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	// Error constants
	var CONFIG_REQUIRED = 'Configuration Object Required';
	var PROCESS_REQUIRED = 'required paramenter [process] must be a function';
	var SOURCE_REQUIRED = 'Source is required to be an array, function, promise or stream';
	var TYPE_PROCEED_ON_ERROR = 'parameter stopOnError must be a boolean';
	var TYPE_EVENT_HANDLER = 'Event handlers must be functions';
	var POOLING_REQUIRES_FUNCTION_SOURCE = 'Only Function source can be used with pooling';

	var JobQueuer = function () {
	  function JobQueuer(config) {
	    _classCallCheck(this, JobQueuer);

	    if (!config) throw new Error(CONFIG_REQUIRED);
	    if (!config.process || typeof config.process !== 'function') throw new Error(PROCESS_REQUIRED);
	    if (!config.source || this.getType(config.source) === 'invalid') throw new Error(SOURCE_REQUIRED);
	    if (config.stopOnError && typeof config.stopOnError !== 'boolean') throw new Error(TYPE_PROCEED_ON_ERROR);
	    this.events = {};
	    this.debug = config.debug;
	    this.maxProceses = config.maxProceses >= 0 ? config.maxProceses : 1;
	    this.process = config.process;
	    this.stopOnError = config.stopOnError || false;
	    this.sourceType = this.getType(config.source);
	    if (this.sourceType === 'array') {
	      this.source = config.source.slice(0);
	    } else {
	      this.source = config.source;
	    }
	    this.running = 0;
	    this.jobsFinished = 0;
	    this.jobErrors = 0;
	    this.fillingJobs = false;
	    this.autoincrementId = 0;
	    this.status = 'stoped';
	    this.paused = false;
	    this.poolingInterval = config.pooling >= 0 ? config.pooling : false;
	    if (this.sourceType !== 'function' && this.sourceType !== 'promise' && this.poolingInterval !== false) throw new Error(POOLING_REQUIRES_FUNCTION_SOURCE);
	  }

	  _createClass(JobQueuer, [{
	    key: 'data',
	    value: function data(_data) {
	      var obj = {
	        startTime: this.startTime,
	        processed: this.jobsFinished,
	        errors: this.jobErrors,
	        maxProceses: this.maxProceses,
	        stopOnError: this.stopOnError,
	        sourceType: this.sourceType,
	        status: this.status
	      };
	      if (_data) {
	        for (var key in _data) {
	          if (_data.hasOwnProperty(key)) obj[key] = _data[key];
	        }
	      }
	      return obj;
	    }
	  }, {
	    key: 'start',
	    value: function start() {
	      this.status = 'running';
	      this.startTime = new Date();
	      this.emit('start', this.data());
	      this.init();
	    }
	  }, {
	    key: 'pause',
	    value: function pause() {
	      if (this.status === 'running' || this.status === 'pooling') {
	        this.paused = true;
	        this.status = 'paused';
	        this.emit('pause', this.data());
	      }
	    }
	  }, {
	    key: 'resume',
	    value: function resume() {
	      if (this.status !== 'running') {
	        this.paused = false;
	        this.status = 'running';
	        this.emit('resume', this.data());
	        this.fillJobs();
	      }
	    }
	  }, {
	    key: 'getType',
	    value: function getType(source) {
	      return source ? Array.isArray(source) ? 'array' : source.then ? 'promise' : _typeof(source._readableState) === 'object' && typeof source.on === 'function' ? 'stream' : typeof source === 'function' ? 'function' : 'invalid' : 'invalid';
	    }
	  }, {
	    key: 'init',
	    value: function init() {
	      var _this = this;

	      if (this.sourceType === 'promise') {
	        this.log("Got promise source. Resolving");
	        this.source.then(function (data) {
	          _this.sourceType = _this.getType(data);
	          if (_this.sourceType === 'invalid') {
	            throw new Error(SOURCE_REQUIRED);
	          } else if (_this.sourceType !== 'function' && _this.sourceType !== 'promise') {
	            if (_this.poolingInterval !== false) throw new Error(POOLING_REQUIRES_FUNCTION_SOURCE);
	            _this.source = data.slice(0);
	          } else {
	            _this.source = data;
	          }
	          _this.init();
	        }).catch(function (err) {
	          _this.processFinish(err);
	        });
	      } else if (this.sourceType === 'stream') {
	        this.log("Got stream source. Initializing");
	        this.initializeStream();
	      } else {
	        this.log('Got ' + this.sourceType + ' source. Starting');
	        this.fillJobs();
	      }
	    }
	  }, {
	    key: 'processFinish',
	    value: function processFinish(err) {
	      var _this2 = this;

	      if (err) {
	        this.emit('error', err);
	        this.status = 'error';
	      } else {
	        this.status = 'finished';
	      }
	      if (this.poolingInterval === false) {
	        this.emit('processFinish', this.data({ endTime: new Date() }));
	      } else {
	        this.status = 'pooling';
	        this.empty = false;
	        this.emit('pooling', this.data());
	        setTimeout(function () {
	          _this2.status = 'running';
	          _this2.fillJobs();
	        }, this.poolingInterval);
	      }
	    }
	  }, {
	    key: 'on',
	    value: function on(event, handler) {
	      this.events[event] = handler;
	      return this;
	    }
	  }, {
	    key: 'emit',
	    value: function emit(event, payload) {
	      if (event === 'error' && this.stopOnError) this.status = 'error';
	      this.log(event, payload);
	      if (this.events[event]) this.events[event](payload);
	    }
	  }, {
	    key: 'log',
	    value: function log(type, data) {
	      if (this.debug && console) console.log('[' + new Date() + '][' + type + ']', data);
	    }
	  }, {
	    key: 'runningJobsCount',
	    value: function runningJobsCount() {
	      return this.running;
	    }
	  }, {
	    key: 'runJob',
	    value: function runJob(jobPromise) {
	      var _this3 = this;

	      this.running++;
	      var jobId = ++this.autoincrementId;
	      this.emit('jobRun', jobId);
	      var next = function next() {
	        var runningCount = --_this3.running;
	        if (!runningCount && _this3.status === 'empty' || _this3.status === 'error') {
	          _this3.status = 'finished';
	          return _this3.processFinish();
	        }
	        _this3.fillJobs();
	      };

	      var jobStartTime = new Date();
	      jobPromise(function (err, result) {
	        if (err) {
	          _this3.emit('error', err);
	          _this3.jobErrors++;
	        } else if (result) {
	          var jobEndTime = new Date();
	          _this3.emit('jobFinish', {
	            jobId: jobId,
	            jobStartTime: jobStartTime,
	            jobEndTime: jobEndTime,
	            result: result,
	            jobsRunning: _this3.running
	          });
	          _this3.jobsFinished++;
	        }
	        next();
	      });
	    }
	  }, {
	    key: 'fillJobs',
	    value: function fillJobs() {
	      var _this4 = this;

	      if (this.fillingJobs) return;
	      this.fillingJobs = true;

	      var resolveJobValue = function resolveJobValue(jobValue, done) {
	        try {
	          var resolved = false;
	          if (jobValue !== null) {
	            var jobPromise = _this4.process(jobValue, function (err, value) {
	              if (!resolved) done(err, value);
	            });
	            if (jobPromise) {
	              resolved = true;
	              if (typeof jobPromise.then === 'function') {
	                return jobPromise.then(function (data) {
	                  done(null, data);
	                }).catch(done);
	              }
	              done(null, jobPromise);
	            }
	          } else {
	            _this4.status = 'empty';
	            done();
	          }
	        } catch (e) {
	          done(e);
	        }
	      };

	      while (!this.paused && (this.maxProceses === 0 || this.running < this.maxProceses) && this.status === 'running' && (this.sourceType === 'array' && this.source.length || this.sourceType !== 'array')) {
	        this.emit('jobFetch', {
	          jobsRunning: this.running
	        });
	        var job = function job(done) {
	          var item = void 0;
	          var resolved = false;
	          if (_this4.sourceType === 'array') {
	            item = _this4.source.splice(0, 1)[0];
	            if (!_this4.source.length) _this4.status = 'empty';
	          } else if (_this4.sourceType === 'stream') {
	            _this4.waitForStreamData(function (err, jobValue) {
	              // TODO: Error
	              resolveJobValue(jobValue, done);
	            });
	          } else {
	            item = _this4.source(function (err, jobValue) {
	              if (!resolved) {
	                if (err) return done(err);
	                resolveJobValue(jobValue, done);
	              }
	            });
	          }
	          if (undefined !== item) {
	            if (item && item.then && typeof item.then === 'function') {
	              item.then(function (jobValue) {
	                resolveJobValue(jobValue, done);
	              }).catch(done);
	            } else {
	              if (item !== null) {
	                resolved = true;
	                resolveJobValue(item, done);
	              } else {
	                _this4.status = 'empty';
	                resolved = true;
	                done();
	              }
	            }
	          }
	        };
	        this.runJob(job);
	      }
	      this.fillingJobs = false;
	    }
	  }, {
	    key: 'initializeStream',
	    value: function initializeStream() {
	      var _this5 = this;

	      this.source.on('readable', function () {
	        _this5.log('Stream ready. Starting');
	        _this5.streamEnded = false;
	        _this5.fillJobs();
	      });
	      this.source.on('end', function () {
	        _this5.streamEnded = true;
	      });
	      // this.source.on('error', (err) => {
	      //   // TODO: Error handling
	      // })
	    }
	  }, {
	    key: 'waitForStreamData',
	    value: function waitForStreamData(done) {
	      var _this6 = this;

	      if (!this.streamEnded) {
	        setTimeout(function () {
	          var item = _this6.source.read();
	          if (item) {
	            done(null, item);
	          } else {
	            _this6.waitForStreamData(done);
	          }
	        }, 0);
	      } else {
	        done(null, null);
	      }
	    }
	  }]);

	  return JobQueuer;
	}();

	var JobQ = function () {
	  function JobQ(options) {
	    _classCallCheck(this, JobQ);

	    this.instance = new JobQueuer(options);
	  }

	  _createClass(JobQ, [{
	    key: 'on',
	    value: function on(event, handler) {
	      this.instance.on(event, handler);
	      return this;
	    }
	  }, {
	    key: 'start',
	    value: function start() {
	      this.instance.start();
	      return this;
	    }
	  }, {
	    key: 'pause',
	    value: function pause() {
	      this.instance.pause();
	      return this;
	    }
	  }, {
	    key: 'resume',
	    value: function resume() {
	      this.instance.resume();
	      return this;
	    }
	  }, {
	    key: 'runningJobsCount',
	    value: function runningJobsCount() {
	      return this.instance.runningJobsCount();
	    }
	  }]);

	  return JobQ;
	}();

	module.exports = JobQ;

/***/ })
/******/ ]);
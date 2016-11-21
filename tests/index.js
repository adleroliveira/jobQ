'use strict'
const test = require('unit.js')
const JobQueuer = require('../lib/index.js')

describe('JosQ', () => {
  describe('errors', () => {
    describe('No config', () => {
      it('Should throw "Configuration Object Required"', () => {
        test.error(() => {
          new JobQueuer()
        }).is(new Error("Configuration Object Required"))
      })
    })

    describe('No process', () => {
      it('Should throw "required paramenter [process] must be a function"', () => {
        test.error(() => {
          new JobQueuer({})
        }).is(new Error("required paramenter [process] must be a function"))
      })
    })

    describe('No source', () => {
      it('Should throw "Source is required to be a function, promise or array"', () => {
        test.error(() => {
          new JobQueuer({
            process: () => {}
          })
        }).is(new Error("Source is required to be a function, promise or array"))
      })
    })

    describe('Incorrect use of pooling', () => {
      it('Should throw "Only Function source can be used with pooling"', () => {
        test.error(() => {
          new JobQueuer({
            pooling: 0,
            source: [1, 2],
            process: (val) => val
          })
        }).is(new Error("Only Function source can be used with pooling"))

        try {
          new JobQueuer({
            pooling: 0,
            source: new Promise((resolve) => resolve([1, 2])),
            process: (val) => val
          }).start()
        } catch (err) {
          test.error(err).is(new Error("Only Function source can be used with pooling"))
        }
      })
    })

    describe('stopOnError', () => {
      it('Should throw "parameter stopOnError must be a boolean"', () => {
        test.error(() => {
          new JobQueuer({
            process: () => {},
            source: () => {},
            stopOnError: 'bad value'
          })
        }).is(new Error("parameter stopOnError must be a boolean"))
      })

      it('Should stop after error', () => {
        return new Promise((resolve) => {
          new JobQueuer({
            process: (val, cb) => {cb(new Error)},
            source: [1, 2],
            stopOnError: true
          })
          .on('processFinish', (data) => {
            test.number(data.errors).is(1)
            resolve()
          })
          .start()
        })
      })
    })

    describe('job error', () => {
      it("Should have 2 'error' errors (process)", () => {
        const source = [1, 2]
        const process = (_, cb) => {
          cb(new Error('error'))
        }

        return new Promise((resolve) => {
          let errorCount = 0
          const jobQ = new JobQueuer({
            source: source,
            process: process
          })
          jobQ.on('error', (err) => {
            errorCount++
          })
          jobQ.on('processFinish', (data) => {
            test.number(data.errors).is(errorCount).is(2)
            resolve()
          })
          jobQ.start()
        })
      })

      it("Should have 2 'error' errors (source)", () => {
        let count = 0
        const source = (cb) => {
          cb( ++count <= 2 ? new Error('error') : null, null)
        }
        const process = (val) => val

        return new Promise((resolve) => {
          let errorCount = 0
          const jobQ = new JobQueuer({
            source: source,
            process: process
          })
          jobQ.on('error', (err) => {
            errorCount++
          })
          jobQ.on('processFinish', (data) => {
            test.number(data.errors).is(errorCount).is(2)
            resolve()
          })
          jobQ.start()
        })
      })
    })
  })

  describe('Basic example', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let maxConcurrentJobs = 0
    let data
    before(() => {
      return new Promise((resolve) => {
        let jobQ = new JobQueuer({
          maxProceses: 0,
          source: source,
          process: (val, cb) => {
            setTimeout(() => {
              cb(null, val)
            }, 5)
          }
        })
        jobQ.on('jobFinish', () => {
          maxConcurrentJobs = Math.max(maxConcurrentJobs, jobQ.runningJobsCount())
        })
        .on('processFinish', (resp) => {
          data = resp
          resolve()
        })
        .start()
      })
    })
    it('Should have 10 max running job', () => {
      test.number(maxConcurrentJobs).is(10)
    })
    it('Should contain start date', () => {
      test.date(data.startTime)
    })
    it('Should contain end date', () => {
      test.date(data.endTime)
    })
    it('Should have 10 processed', () => {
      test.number(data.processed).is(10)
    })
    it('Should have 0 error', () => {
      test.number(data.errors).is(0)
    })
    it('Should have status finished', () => {
      test.string(data.status).is('finished')
    })
  })

  describe('Parallel', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    it('Should run in parallel', () => {
      return new Promise((resolve) => {
        const jobQ = new JobQueuer({
          maxProceses: 10,
          source: source,
          process: (val, cb) => {
            setTimeout(() => {
              cb(null, val)
            }, 5)
          }
        })
        jobQ.on('processFinish', (resp) => {
          test.bool(50 >= (resp.endTime.valueOf() - resp.startTime.valueOf())).isTrue()
          resolve()
        })
        jobQ.start()
      })
    })
  })

  describe('sync function processor', () => {
    let count
    const maxCount = 10
    const syncSource = () => (++count <= maxCount) ? count : null
    let sourceCallback = (done) => {
      setTimeout(() => {
        done(null, syncSource())
      }, 0)
    }
    const sourceArray = [234,23,423,4,243,4,3,3,2,6]
    const sourceArrayOfPromises = sourceArray.map((n) => new Promise((resolve, reject) => resolve(n)))
    const sourcePromise = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(syncSource()), 0)
      })
    }

    beforeEach(() => {
      count = 0
    })

    const process = (val) => val
    it('Should work with array source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceArray,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise array source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceArrayOfPromises,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with sync function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: syncSource,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with async callback function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceCallback,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourcePromise,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: new Promise((resolve) => resolve(sourceArray)),
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })
  })

  describe('async function processor', () => {
    let count
    const maxCount = 10
    const syncSource = () => (++count <= maxCount) ? count : null
    let sourceCallback = (done) => {
      setTimeout(() => {
        done(null, syncSource())
      }, 0)
    }
    const sourceArray = [234,23,423,4,243,4,3,3,2,6]
    const sourceArrayOfPromises = sourceArray.map((n) => new Promise((resolve, reject) => resolve(n)))
    const sourcePromise = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(syncSource()), 0)
      })
    }

    beforeEach(() => {
      count = 0
    })

    const process = (val, cb) => {
      setTimeout(() => cb(null, val), 0)
    }
    it('Should work with array source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceArray,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise array source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceArrayOfPromises,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with sync function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: syncSource,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with async callback function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceCallback,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourcePromise,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: new Promise((resolve) => resolve(sourceArray)),
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })
  })

  describe('promise processor', () => {
    let count
    const maxCount = 10
    const syncSource = () => ++count <= maxCount ? count : null
    let sourceCallback = (done) => {
      setTimeout(() => {
        done(null, syncSource())
      }, 0)
    }
    const sourceArray = [234,23,423,4,243,4,3,3,2,6]
    const sourceArrayOfPromises = sourceArray.map((n) => new Promise((resolve, reject) => resolve(n)))
    const sourcePromise = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(syncSource()), 0)
      })
    }

    beforeEach(() => {
      count = 0
    })

    const process = (val) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(val), 0)
      })
    }
    it('Should work with array source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceArray,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise array source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceArrayOfPromises,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with sync function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: syncSource,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with async callback function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourceCallback,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise function source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: sourcePromise,
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise source', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: new Promise((resolve) => resolve(syncSource)),
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(10)
          resolve()
        }).start()
      })
    })

    it('Should work with promise source (error)', () => {
      return new Promise((resolve) => {
        new JobQueuer({
          maxProceses: 5,
          source: new Promise((_, reject) => {
            reject(new Error)
          }),
          process: process
        }).on('processFinish', (data) => {
          test.number(data.processed).is(0)
          test.number(data.errors).is(0)
          test.string(data.status).is('error')
          resolve()
        }).start()
      })
    })
  })

  describe('events', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let events = {
      start: 0,
      jobFetch: 0,
      jobRun: 0,
      jobFinish: 0,
      processFinish: 0,
      error: 0
    }
    before(() => {
      return new Promise((resolve) => {
        new JobQueuer({
          source: new Promise((resolve) => resolve(source)),
          process: (val) => {
            if (val > 7) throw new Error('error')
            return val
          }
        })
        .on('start', () => events.start++)
        .on('jobFetch', () => events.jobFetch++)
        .on('jobRun', () => events.jobRun++)
        .on('jobFinish', () => events.jobFinish++)
        .on('processFinish', () => {
          events.processFinish++
          resolve()
        })
        .on('error', () => events.error++)
        .start()
      })
    })

    it('Should call start once', () => {
      test.number(events.start).is(1)
    })

    it('Should call jobFetch 10 times', () => {
      test.number(events.jobFetch).is(10)
    })

    it('Should call jobRun 10 times', () => {
      test.number(events.jobRun).is(10)
    })

    it('Should call jobFinish 7 times', () => {
      test.number(events.jobFinish).is(7)
    })

    it('Should call processFinish once', () => {
      test.number(events.processFinish).is(1)
    })

    it('Should call error 3 times', () => {
      test.number(events.error).is(3)
    })
  })

  describe('pause', () => {
    let pauseCount
    let resumeCount
    before((done) => {
      pauseCount = 0
      resumeCount = 0
      done()
    })
    it('Should pause', () => {
      return new Promise((resolve) => {
        const queue = new JobQueuer({
          source: [1, 2, 3],
          process: (val) => val
        })
        queue.on('jobFetch', () => {
          // Should be called once
          queue.pause().pause()
        }).on('pause', (data) => {
          pauseCount++
          test.string(data.status).is('paused')
          setTimeout(() => {
            // Should be called once
            queue.resume().resume()
          }, 0)
        }).on('resume', (data) => {
          resumeCount++
          test.string(data.status).is('running')
        }).on('processFinish', () => {
          test.number(resumeCount).is(2)
          test.number(pauseCount).is(3)
          resolve()
        }).start()
      })
    })
  })

  describe('pooling', () => {
    it('should start pooling instead of finishing', () => {
      return new Promise((resolve, reject) => {
        let count = 0
        let pooling = 0
        const items = [1, null]
        const queue = new JobQueuer({
          source: (cb) => items[++count],
          process: (val) => val,
          pooling: 0
        })
        queue.on('pooling', () => {
          pooling++
          queue.pause()
        }).on('pause', () => {
          setTimeout(() => {
            test.number(pooling).is(1)
            resolve()
          }, 5)
        }).on('processFinish', () => {
          reject()
        }).start()
      })
    })
  })

  describe('sync and async coherence', () => {
    it('should ignore callback', () => {
      return new Promise((resolve, reject) => {
        new JobQueuer({
          source: (cb) => {
            setTimeout(() => {
              cb(new Error)
            }, 0);
            return null
          },
          process: (val) => val
        }).on('error', reject).on('processFinish', (data) => {
          test.number(data.errors).is(0)
          setTimeout(() => {
            resolve()
          }, 5)
        }).start()
      })
    })

    it('should ignore callback', () => {
      return new Promise((resolve, reject) => {
        new JobQueuer({
          source: [1, 2, 3],
          process: (val, cb) => {
            setTimeout(() => {
              cb(new Error)
            }, 0);
            return val
          }
        }).on('error', reject).on('processFinish', (data) => {
          test.number(data.errors).is(0)
          setTimeout(() => {
            resolve()
          }, 5)
        }).start()
      })
    })
  })
})
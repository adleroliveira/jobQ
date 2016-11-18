// Error constants
const CONFIG_REQUIRED = 'Configuration Object Required'
const PROCESS_REQUIRED = 'required paramenter [process] must be a function'
const SOURCE_REQUIRED = 'Source is required to be a function, promise or array'
const TYPE_PROCEED_ON_ERROR = 'parameter stopOnError must be a boolean'
const TYPE_EVENT_HANDLER = 'Event handlers must be functions'

class JobQueuer {
  constructor(config) {
    if (!config) throw new Error(CONFIG_REQUIRED)
    if (!config.process || typeof config.process !== 'function') throw new Error(PROCESS_REQUIRED)
    if (
      !config.source || (
        typeof config.source !== 'function' &&
        !Array.isArray(config.source) &&
        !config.source.then
      )
    ) throw new Error(SOURCE_REQUIRED)
    if (config.stopOnError && typeof config.stopOnError !== 'boolean') throw new Error(TYPE_PROCEED_ON_ERROR)
    this.events = {}
    this.debug = config.debug
    this.maxProceses = config.maxProceses || 1
    this.process = config.process
    this.stopOnError = config.stopOnError || false
    this.sourceType = Array.isArray(config.source) ? 'array' : config.source.then ? 'promise' : 'function'
    if (this.sourceType === 'array') {
      this.source = config.source.slice(0)
    } else {
      this.source = config.source
    }
    this.running = 0
    this.jobsFinished = 0
    this.jobErrors = 0
    this.fillingJobs = false
    this.autoincrementId = 0
    this.status = 'stoped'
  }

  start() {
    this.status = 'running'
    this.startTime = new Date()
    this.emit('start', {
      startTime: this.startTime,
      maxProceses: this.maxProceses,
      stopOnError: this.stopOnError,
      sourceType: this.sourceType,
      status: this.status
    })
    this.init()
  }

  init () {
    if (this.sourceType === 'promise') {
      this.source.then((data) => {
        this.sourceType = Array.isArray(data) ? 'array' : data.then ? 'promise' : 'function'
        if (this.sourceType === 'array') {
          this.source = data.slice(0)
        } else {
          this.source = data
        }
        this.init()
      }).catch((err) => {
        this.processFinish(err)
      })
    } else {
      this.fillJobs()
    }
  }

  processFinish (err) {
    if (err) {
      this.emit('error', err)
      this.status = 'error'
    } else {
      this.status = 'finished'
    }
    this.emit('processFinish', {
      startTime: this.startTime,
      endTime: new Date(),
      processed: this.jobsFinished,
      errors: this.jobErrors,
      status: this.status
    })
  }

  on(event, handler) {
    this.events[event] = handler
    return this
  }

  emit(event, payload) {
    if (event === 'error' && this.stopOnError) this.status = 'error'
    if (this.debug && console) console.log(`[${new Date()}][${event}]`, payload)
    if (this.events[event]) this.events[event](payload)
  }

  runningJobsCount() {
    return this.running
  }

  runJob(jobPromise) {
    this.running++
    let jobId = ++this.autoincrementId
    this.emit('jobRun', jobId)
    let next = () => {
      let runningCount = --this.running
      if ((!runningCount && this.status === 'empty') || this.status === 'error') {
        this.status = 'finished'
        return this.processFinish()
      }
      this.fillJobs()
    }

    let jobStartTime = new Date()
    jobPromise((err, result) => {
      if (err) {
        this.emit('error', err)
        this.jobErrors ++
      } else if (result) {
        let jobEndTime = new Date()
        this.emit('jobFinish', {
          jobId,
          jobStartTime,
          jobEndTime,
          result,
          jobsRunning: this.running
        })
        this.jobsFinished ++
      }
      next()
    })
  }

  fillJobs () {
    if (this.fillingJobs) return
    this.fillingJobs = true

    const resolveJobValue = (jobValue, done) => {
      try {
        let resolved = false
        if (jobValue) {
          let jobPromise = this.process(jobValue, (err, value) => {
            if (!resolved) done(err, value)
          })
          if (jobPromise) {
            resolved = true
            if (typeof jobPromise.then === 'function') {
              return jobPromise.then((data) => {
                done(null, data)
              }).catch(done)
            }
            done(null, jobPromise)
          }
        } else {
          this.status = 'empty'
          done()
        }
      } catch (e) {
        done(e)
      }
    }

    while (
      (this.maxProceses === 0 || this.running < this.maxProceses)
      && this.status === 'running'
      && ((this.sourceType === 'array' && this.source.length) || (this.sourceType !== 'array'))
    ) {
      this.emit('jobFetch', {
        jobsRunning: this.running
      })

      const job = (done) => {
        let item
        let resolved = false
        if (this.sourceType === 'array') {
          item = this.source.splice(0, 1)[0]
          if (!this.source.length) this.status = 'empty'
        } else {
          item = this.source((err, jobValue) => {
            if (!resolved) {
              if (err) return done(err)
              resolveJobValue(jobValue, done)
            }
          })
        }
        if (undefined !== item) {
          if (item && item.then && typeof item.then === 'function') {
            item.then((jobValue) => {
              resolveJobValue(jobValue, done)
            }).catch(done)
          } else {
            if (item) {
              resolved = true
              resolveJobValue(item, done)
            } else {
              this.status = 'empty'
              done()
            }
          }
        }
      }
      this.runJob(job)
    }
    this.fillingJobs = false
  }
}

class JobQ {
  constructor (options) {
    this.instance = new JobQueuer(options)
  }

  on (event, handler) {
    this.instance.on(event, handler)
    return this
  }

  start () {
    this.instance.start()
    return this
  }

  runningJobsCount () {
    return this.instance.runningJobsCount()
  }
}

module.exports = JobQ


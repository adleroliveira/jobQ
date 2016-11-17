const uuid = require('node-uuid')

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
    this.running = {}
    this.jobsFinished = 0
    this.jobErrors = 0
    this.fillingJobs = false
    this.status = 'stoped'
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

  start() {
    this.status = 'running'
    this.startTime = this.startTime || new Date()
    if (this.sourceType === 'promise') {
      const self = this
      this.source.then((data) => {
        this.sourceType = Array.isArray(data) ? 'array' : data.then ? 'promise' : 'function'
        if (this.sourceType === 'array') {
          this.source = data.slice(0)
        } else {
          this.source = data
        }
        this.start()
      }).catch((err) => {
        this.emit('error', err)
        this.status = 'error'
        this.emit('processFinish', {
          startTime: this.startTime,
          endTime: new Date(),
          processed: this.jobsFinished,
          errors: this.jobErrors,
          status: this.status
        })
      })
    } else {
      this.emit('start', {
        startTime: this.startTime,
        maxProceses: this.maxProceses,
        stopOnError: this.stopOnError,
        sourceType: this.sourceType,
        status: this.status,
        type: this.sourceType
      })
      this.fillJobs()
    }
    return this
  }

  runningJobsCount() {
    return Object.keys(this.running).length
  }

  runJob(jobPromise) {
    let jobId = uuid.v4()
    this.emit('jobRun', jobId)
    this.running[jobId] = jobPromise
    let next = () => {
      let self = this
      var jobToDelete = this.running[jobId]
      delete this.running[jobId]
      let runningCount = Object.keys(this.running).length
      if ((!runningCount && this.status === 'empty') || this.status === 'error') {
        this.status = 'finished'
        return this.emit('processFinish', {
          startTime: this.startTime,
          endTime: new Date(),
          processed: this.jobsFinished,
          errors: this.jobErrors,
          status: this.status
        })
      }
      this.fillJobs()
    }

    let jobStartTime = new Date()
    jobPromise.then((result) => {
      if (result) {
        let jobEndTime = new Date()
        this.emit('jobFinish', {
          jobId,
          jobStartTime,
          jobEndTime,
          result,
          jobsRunning: Object.keys(this.running).length
        })
        this.jobsFinished ++
      }
      next()
    })
    .catch((e) => {
      this.emit('error', e)
      this.jobErrors ++
      next()
    })
  }

  fillJobs () {
    if (this.fillingJobs) return
    this.fillingJobs = true

    const resolveJobValue = (jobValue, resolve, reject) => {
      if (jobValue) {
        let jobPromise = this.process(jobValue, (err, value) => {
          if (err) return reject(err)
          resolve(value)
        })
        if (jobPromise) {
          if (typeof jobPromise.then === 'function') return jobPromise.then(resolve)
          resolve(jobPromise)
        }
      } else {
        resolve()
        this.status = 'empty'
      }
    }

    while (
      Object.keys(this.running).length < this.maxProceses
      && this.status === 'running'
      && ((this.sourceType === 'array' && this.source.length) || (this.sourceType !== 'array'))
    ) {
      this.emit('jobFetch', {
        jobsRunning: Object.keys(this.running).length
      })
      this.runJob(new Promise((resolve, reject) => {
        let item
        if (this.sourceType === 'array') {
          item = this.source.pop()
          if (!this.source.length) this.status = 'empty'
        } else {
          item = this.source((err, jobValue) => {
            if (err) return reject(err)
            resolveJobValue(jobValue, resolve, reject)
          })
        }
        if (undefined !== item) {
          if (item && item.then && typeof item.then === 'function') {
            item.then((jobValue) => {
              resolveJobValue(jobValue, resolve, reject)
            }).catch(reject)
          } else {
            if (item) {
              resolveJobValue(item, resolve, reject)
            } else {
              this.status = 'empty'
              resolve()
            }
          }
        }
      }))
    }
    this.fillingJobs = false
  }
}

module.exports = JobQueuer


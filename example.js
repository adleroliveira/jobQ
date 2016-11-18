const JobQueuer = require('./index.js')

// Setup
let maxJobs = 10
let currJob = 0
let maxConcurrentJobs = 4

// Utils
let fakeFind = (_, cb) => {
  setTimeout(() => {
    cb(null, ++currJob <= maxJobs)
  }, 1000)
}

// Sources
let source = () => (++currJob <= maxJobs)
let sourceCallback = (done) => fakeFind(1, done)
let sourceArray = [234,23,423,4,243,4,3,3,2,6]
let sourceArrayOfPromises = sourceArray.map((n) => new Promise((resolve, reject) => resolve(n)))
let sourcePromise = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(++currJob <= maxJobs), 1000)
  })
}

// Processors
let promiseProcess = (x) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(x), Math.floor((Math.random() * 5000) + 1000))
  })
}

let callbackProcess = (x, cb) => {
  setTimeout(() => cb(null, x), Math.floor((Math.random() * 5000) + 1000))
}

let callbackProcessReturn = (x) => {
  return x
}

// Program
let jobQ = new JobQueuer({
  process: callbackProcessReturn,
  source: source,
  maxProceses: maxConcurrentJobs
})
.on('start', () => events.start++)
.on('jobFetch', () => events.jobFetch++)
.on('jobRun', () => events.jobRun++)
.on('jobFinish', () => events.jobFinish++)
.on('processFinish', () => {
  events.processFinish++
  console.log(events)
})
.on('error', (err) => {
  console.log(err)
  events.error++
})
.start()

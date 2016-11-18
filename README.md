[![Build Status](https://travis-ci.org/adleroliveira/jobQ.svg?branch=master)](https://travis-ci.org/adleroliveira/jobQ)

# jobQ
Async and parallel execution of jobs, tasks and processes. This library is aimed to solve the problem of having to limit how many parallel tasks you want to perform.
It accepts several kinds of sources including Arrays, Promises, Functions, etc.

## Installation
```bash
npm install --save jobq
```

## Usage
```js
var jobQ = require('jobq')

var queue = new jobQ({
  process: function(x, callback){
    setTimeout(function() {
      callback(null, x)
    }, 3000)
  },
  source: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  maxProceses: 2
})

queue.start()
```

## Options
* source: **required** [View source section.](#source)
* process: **required** [View process section.](#process)
* maxProceses: ```<Number>``` indicates how many jobs will run in parallel. A value of ```0``` means 'no limit'. Default ```1```
* debug: ```<Boolean>``` enables or disables debug. Default ```false```
* stopOnError: ```<Boolean>``` indicates if jobs will stop after first error or continue. If enabled, ```processFinish``` will be called with status ```error``` if an error occurs. Default ```false```

## Events
```js
var queue = new jobQ({
  process: myProcess,
  source: mySource,
  maxProceses: 2
})

queue.on('start', function(){})
queue.on('jobFetch', function(){})
queue.on('jobRun', function(){})
queue.on('jobFinish', function(){})
queue.on('processFinish', function(){})
queue.on('error', function(){})

queue.start()
```

#### start
Emited once after calling ```start()``` with an object containing:
 * startTime: ```<Date>``` date when start was called
 * maxProceses: ```<Number>``` maxProceses passed to constructor. Default ```1```
 * stopOnError: ```<Boolean>``` stopOnError passed to constructor. Default ```false```
 * sourceType: ```<String>``` Detected source type (```array```, ```promise``` or ```function```).
 * status: ```<String>``` queue status. will always be running at this point.

#### jobFetch
Emited once for each job before fetching it from the queue with an object containing:
 * jobsRunning: ```<Number>``` current amount of processing jobs. It will not count the one that triggered the event.

#### jobRun
Emited once for each job when it starts running with:
 * ```<number>``` job id (autoincrement)

#### jobFinish
Emited once after calling ```start()``` with an object containing:
 * jobId: ```<Number>``` job id
 * jobStartTime: ```<Date>``` date when job started to process
 * jobEndTime: ```<Date>``` date when job finishes to process
 * result: ```<any>``` job result received
 * jobsRunning: ```<Number>``` current amount of processing jobs. It will count the one that triggered the event.

#### processFinish
Emited once after calling ```start()``` with an object containing:
 * startTime: ```<Date>``` date when start was called
 * endTime: ```<Date>``` date when queue was fully processed
 * processed: ```<Number>``` total amount of jobs processed
 * errors: ```<Number>``` total amount of errors
 * status: ```<String>``` queue status. will always be ```finished``` or ```error```.

#### error
Emited once for each job error:
 * ```<Error>``` error received

## Source
Source is where data will be fetched in order to be processed. It can be one of the following:
* ```<Array>``` like ```[1, 2, 3]```.
* ```<Array>``` of promise like ```[promise1, promise2, promise3]```.
* ```<Function>``` returning a value.
* ```<Function>``` returning a promise.
* ```<Function(callback)>``` returning nothing and passing data to ```callback``` with error as the first parameter and response as the second one.
* ```<Promise>``` that resolves to any of the previous source types

## Process
Process function receives a value from the queue and be anby of the following:
* ```<Function>``` that returns a value
* ```<Function>``` that returns a Promise wich resolves to a value
* ```<Function(callback)>``` that returns nothing and executes a ```callback``` with error as the first parameter and response as the second one.
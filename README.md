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

## Source
The following source types are accepted:

* Array
* Array of Promises
* Promise
* Function that returns a Promise
* Function that Return a Value
* Function with Callback

## Process
The following process types are accepted:

* Function that returns a value
* Function that returns a Promise
* Function that executes a Callback